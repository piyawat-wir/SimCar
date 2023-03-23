import './style.css'
import { Vector2 } from './Vector2';

const cv = document.createElement("canvas");
document.body.appendChild(cv);

const ctx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

function resize() {
	cv.width = window.innerWidth;
	cv.height = window.innerHeight;
	cv.style.width = cv.width.toString() + "px"
	cv.style.height = cv.height.toString() + "px"
}
resize()
window.addEventListener("resize", resize)

const wheelSpeed = { // -100 to 100
	left: 0,
	right: 0,
}
let angle = 0; // degree

const wheelDistance = 20 // cm
const halfWheelDistance = wheelDistance / 2 // cm
const wheelMaxSpeed = 20 // cm/s
const sensorDistance = 3 // cm

function setSpeedLR(left: number, right: number) {
	wheelSpeed.left = left;
	wheelSpeed.right = right;
}

function setSteerAngle(deg: number) {
	angle = Math.min(Math.max(deg, -180), 180);
}

function setSpeed(spd: number) {
	const angleSize = Math.abs(angle);
	spd = Math.min(Math.max(spd, 0), 100);
	const weakSpd = Math.floor(100 - (angleSize / 90 * spd));
	let leftSpd = spd, rightSpd = spd;

	if (angleSize != 0) {
		if (angle > 0) rightSpd = weakSpd;
		else leftSpd = weakSpd;
	}

	setSpeedLR(leftSpd, rightSpd);
}

const pixelPerUnit = 10;
const Car = {
	position: new Vector2,
	rotation: 0, // rad
	size: new Vector2(wheelDistance, 2 * wheelDistance), // unit
	vert: [
		new Vector2(- halfWheelDistance, - wheelDistance),
		new Vector2(+ halfWheelDistance, - wheelDistance),
		new Vector2(+ halfWheelDistance, + wheelDistance),
		new Vector2(- halfWheelDistance, + wheelDistance),
	],
	vertPos: [] as Vector2[],
	sensorVert: [
		new Vector2(+ sensorDistance, wheelDistance + 1),
		new Vector2(0, wheelDistance + 1),
		new Vector2(- sensorDistance, wheelDistance + 1),
	],
	sensorPos: [] as Vector2[],
	sensorValue: [] as boolean[],
}

const rotateVector = (v: Vector2, rad: number) => new Vector2(
	v.x * Math.cos(rad) - v.y * Math.sin(rad),
	v.x * Math.sin(rad) + v.y * Math.cos(rad)
)

function drawPoint(v: Vector2) {
	const s = pixelPerUnit;
	const { data } = getBackgroundAt(s * v.x, s * v.y, 1, 1);
	const color = data.slice(0, -1).map(v => 255 - v);
	ctx.fillStyle = `rgba(${color})`;
	ctx.fillRect(s * v.x - 3, s * v.y - 3, 6, 6);
}
function drawCar() {
	const s = pixelPerUnit;
	const offset = Car.vertPos;
	ctx.beginPath();
	ctx.moveTo(s * offset[0].x, s * offset[0].y);
	offset.forEach((v, i) => {
		const j = (i + 1) % 4;
		ctx.lineTo(s * offset[j].x, s * offset[j].y);
	})
	ctx.fillStyle = "rgba(220, 80, 126, 0.9)"
	ctx.fill();

	drawPoint(Car.position)
}
function drawSensor() {
	Car.sensorPos.forEach((v, i) => drawPoint(v))
}

function calcCarVertPos() {
	const rotated = Car.vert.map(v => rotateVector(v, angle * Math.PI / 180));
	const offset = rotated.map(v => v.add(Car.position));
	Car.vertPos = offset;
}
function calcSensorPos() {
	const rotated = Car.sensorVert.map(v => rotateVector(v, angle * Math.PI / 180));
	const offset = rotated.map(v => v.add(Car.position));
	Car.sensorPos = offset;
}

function getBackgroundAt(x: number, y: number, w: number, h: number) {
	let pos = new Vector2(x, y);
	pos = new Vector2(cv.width / 2, cv.height / 2).add(new Vector2(pos.x, -pos.y));
	pos = pos.sub(new Vector2(w / 2, h / 2));
	return ctx.getImageData(pos.x, pos.y, w, h)
}

function readSensor() {
	const s = pixelPerUnit;
	const size = 2 * s;
	Car.sensorValue = Car.sensorPos.map(sv => {
		let pos = sv.scale(s);
		const { data } = getBackgroundAt(pos.x, pos.y, size, size);
		let sum = 0;
		for (let i = 0; i < data.length; i += 4) {
			const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
			sum += brightness > 127 ? 1 : 0;
		}
		const avg = sum / (data.length / 4)
		return avg >= 0.5 ? true : false;
	})
}

const worker = new Worker("worker.js");

const workerDoWork = () => new Promise<void>(resolve => {
	worker.postMessage("start")
	worker.onmessage = e => {
		const message = e.data as string;
		if (message === "done") resolve();
	}
})


async function render() {
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, cv.width, cv.height);
	
	ctx.font = "20px Tahoma"
	ctx.textBaseline = "top"
	ctx.fillStyle = "black";
	ctx.fillText(`${Car.sensorValue.map(a => a ? 1 : 0)}`, 10, 10)
	ctx.fillText(`FPS: ${Runtime.fps.toFixed(2)}`, 10, 35)
	ctx.fillText(`TPS: ${Runtime.tps.toFixed(2)}`, 10, 60)

	ctx.translate(cv.width / 2, cv.height / 2);
	ctx.scale(1, -1);
	ctx.fillStyle = "black";
	ctx.fillRect(200, 0, 100, 100);
	readSensor();
	drawCar();
	drawSensor();
	await workerDoWork();
	ctx.scale(1, -1);
	ctx.translate(-cv.width / 2, -cv.height / 2);
}

let count = 0;

async function logic() {
	calcCarVertPos();
	calcSensorPos();
	setSteerAngle(Math.sin(0.5 * count * Math.PI / 180) * 180)
	count++;
}


function createRuntime(rate: number, counter: RuntimeCounter | null, func: () => Promise<void>) {
	return new Promise(
		async (stop) => {
			let remain = 0;
			let now = 0;
			let msPerLoop = 1000 / rate;
			while (true) {
				now = Date.now();
				await func();
				if (counter) {
					counter.count++;
					counter.totalTime += remain > 0 ? msPerLoop : msPerLoop - remain;
				}
				remain = msPerLoop - (Date.now() - now);
				await new Promise(resolve => setTimeout(resolve, Math.max(0, remain)));
			}
		}
	)
}

interface RuntimeCounter {
	totalTime: number
	count: number
}

const Runtime = {
	expectTPS: 120,
	expectFPS: 60,
	ticks: { totalTime: 0, count: 0 } as RuntimeCounter,
	frames: { totalTime: 0, count: 0 } as RuntimeCounter,
	tps: 0,
	fps: 0,
}

async function rateFunction() {
	Runtime.tps = 1000 / (Runtime.ticks.totalTime / Runtime.ticks.count) || Infinity;
	Runtime.fps = 1000 / (Runtime.frames.totalTime / Runtime.frames.count) || Infinity;
	Runtime.ticks.totalTime = 0;
	Runtime.frames.totalTime = 0;
	Runtime.ticks.count = 0;
	Runtime.frames.count = 0;
}

const logicRuntime = createRuntime(Runtime.expectTPS, Runtime.ticks, logic)
const renderRuntime = createRuntime(Runtime.expectFPS, Runtime.frames, render)
const rateRuntime = createRuntime(1, null, rateFunction)
// render(60)