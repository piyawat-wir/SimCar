import './style.css'
import trackImgSrc from './trackA.png'
import { Vector2 } from './Vector2';

const cv = document.createElement("canvas");
document.body.appendChild(cv);

const trackImg = document.createElement("img");
trackImg.src = trackImgSrc;

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

const wheelDistance = 15 // cm
const halfWheelDistance = wheelDistance / 2 // cm
const wheelMaxSpeed = 10 // cm/s
const sensorDistance = 3 // cm
const expectSpd = {
	left: 0,
	right: 0,
}

function setSpeed(left: number, right: number) {
	expectSpd.left = constrain(left, -100, 100);
	expectSpd.right = constrain(right, -100, 100);
}
function updateRealSpeed() {
	const delay = 0.1;
	const deltaL = expectSpd.left - wheelSpeed.left;
	const deltaR = expectSpd.right - wheelSpeed.right;
	wheelSpeed.left += delay * deltaL;
	wheelSpeed.right += delay * deltaR;
}

const pixelPerUnit = 2;
const Car = {
	position: new Vector2(157, -100),
	rotation: 10 * Math.PI / 180, // rad
	size: new Vector2(wheelDistance, 2 * wheelDistance), // unit
	vert: [
		new Vector2(- halfWheelDistance, - wheelDistance),
		new Vector2(+ halfWheelDistance, - wheelDistance),
		new Vector2(+ halfWheelDistance, + wheelDistance),
		new Vector2(- halfWheelDistance, + wheelDistance),
	],
	vertPos: [] as Vector2[],
	sensorVert: [
		new Vector2(- sensorDistance, wheelDistance + 1),
		new Vector2(0, wheelDistance + 1),
		new Vector2(+ sensorDistance, wheelDistance + 1),
	],
	sensorPos: [] as Vector2[],
	sensorValue: [] as number[],
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
	const rotated = Car.vert.map(v => rotateVector(v, Car.rotation));
	const offset = rotated.map(v => v.add(Car.position));
	Car.vertPos = offset;
}
function calcSensorPos() {
	const rotated = Car.sensorVert.map(v => rotateVector(v, Car.rotation));
	const offset = rotated.map(v => v.add(Car.position));
	Car.sensorPos = offset;
}

function getBackgroundAt(x: number, y: number, w: number, h: number) {
	let pos = new Vector2(x, y);
	pos = new Vector2(cv.width / 2, cv.height / 2).add(new Vector2(pos.x, -pos.y));
	pos = pos.sub(new Vector2(w / 2, h / 2));
	return ctx.getImageData(Math.round(pos.x), Math.round(pos.y), w, h)
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
		return avg >= 0.5 ? 0 : 1;
	})
}

async function render() {
	const s = pixelPerUnit;
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, cv.width, cv.height);

	ctx.font = "20px Tahoma"
	ctx.textBaseline = "top"
	ctx.fillStyle = "black";
	ctx.fillText(`${Car.sensorValue}`, 10, 10)
	ctx.fillText(`FPS: ${Runtime.fps.toFixed(2)}`, 10, 35)
	ctx.fillText(`TPS: ${Runtime.tps.toFixed(2)}`, 10, 60)
	let i = 0;
	for (let v in ctrl) {
		ctx.fillText(`${v}: ${ctrl[v as keyof typeof ctrl].toFixed(2)}`, 10, 85 + i)
		i += 25;
	}
	ctx.fillText(`left: ${wheelSpeed.left.toFixed(2)}`, 10, 260)
	ctx.fillText(`right: ${wheelSpeed.right.toFixed(2)}`, 10, 285)

	ctx.translate(cv.width / 2, cv.height / 2);
	ctx.drawImage(trackImg, - trackImg.width / 2, -trackImg.height / 2);
	ctx.scale(1, -1);
	readSensor();
	drawCar();
	drawSensor();
	ctx.scale(1, -1);
	ctx.translate(-cv.width / 2, -cv.height / 2);
}

async function logic() {
	calcCarVertPos();
	calcSensorPos();
	updateRealSpeed();
	const { left, right } = wheelSpeed;
	const avgSpd = wheelMaxSpeed * (left + right) / 200;
	const dt = Runtime.tps ? Runtime.tps / 1000 : 0;
	const ratio = (left + right) / (right - left);
	const radius = ratio * halfWheelDistance;
	const distCovered = avgSpd * dt; // s = vt
	const radCovered = distCovered / (ratio * halfWheelDistance);
	const isInvalid = radCovered == 0 || radius == 0 || left == right;
	const xAdd = isInvalid ? 0 : radius - radius * Math.cos(radCovered);
	const yAdd = isInvalid ? distCovered : radius * Math.sin(radCovered);
	const posAdd = rotateVector(new Vector2(xAdd, yAdd), Car.rotation);
	Car.position = Car.position.add(posAdd);
	if (Number.isFinite(radCovered)) Car.rotation += radCovered;
	else {
		const wheelRad_per_dt = wheelMaxSpeed * (right / 800);
		const rad = wheelRad_per_dt * dt; // s = vt
		Car.rotation += rad;
	}
}

const constrain = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

let recentSensorOutput = 0;
function getDiscreteError() {
	const left = Car.sensorValue[0];
	const mid = Car.sensorValue[1];
	const right = Car.sensorValue[2];
	let sensorOutput = parseInt(`${left}${mid}${right}`, 2)
	let err = 0;
	let mul = 1;
	if ([0b111, 0b000].includes(sensorOutput)) {
		sensorOutput = recentSensorOutput;
		recentSensorOutput = 0b010;
		mul = 4;
		err += [0b001, 0b011] ? -0.1 : 0.1;
	}
	if (sensorOutput == 0b100) err = 1;
	else if (sensorOutput == 0b010) err += 0;
	else if (sensorOutput == 0b001) err += -1;
	else if (sensorOutput == 0b110 && [0b100, 0b010, 0b110].includes(recentSensorOutput)) err += 0.5;
	else if (sensorOutput == 0b011 && [0b001, 0b010, 0b011].includes(recentSensorOutput)) err += -0.5;
	else if (sensorOutput == 0b000 && recentSensorOutput == 0b110) err += 2;
	else if (sensorOutput == 0b000 && recentSensorOutput == 0b011) err += -2;
	err *= mul;
	recentSensorOutput = sensorOutput;
	return err;
}
let errorHistory = [0, 0, 0, 0, 0, 0];
const n = errorHistory.length;
const dt = 1; // ticks
const sum_t = -(n / 2) * (n - 1) * dt;
const sum_t2 = (n * (n - 1) * (2 * n - 1) / 6) * dt;
function calculateErrorFunc() {
	const sum_x = errorHistory.reduce((a, b) => a + b, 0);
	const sum_tx = errorHistory.reduce((a, b, i) => a + (-i * dt * b), 0);
	const denominator = n * sum_t2 - sum_t ** 2;
	const A = (n * sum_tx - sum_t * sum_x) / denominator;
	const B = (sum_x * sum_t2 - sum_t * sum_tx) / denominator;
	const E = (t: number) => A * t + B;
	return E;
}
let gain = {
	kP: 65, //17.5
	kI: 0.001, // 0.02
	kD: 95, //12
}
let ctrl = {
	err: 0,
	P: 0,
	I: 0,
	D: 0,
	oldI: 0,
	oldErr: 0,
	out: 0
}

let maxspd = 100;
let spd = maxspd;
setSpeed(spd, spd);

async function carCPU() {
	const currentErr = getDiscreteError();
	errorHistory = [currentErr, ...errorHistory.slice(0, -1)];
	const E = calculateErrorFunc();
	ctrl.err = E(4.2);
	const { err, oldErr, oldI } = ctrl;
	const { kP, kI, kD } = gain;
	ctrl.P = kP * err;
	ctrl.I = oldI + (kI * err);
	ctrl.D = kD * (err - oldErr);
	const { P, I, D } = ctrl;
	ctrl.oldErr = err;
	ctrl.oldI = I;
	ctrl.out = P + I + D;
	setSpeed(maxspd - ctrl.out, maxspd + ctrl.out);
	// updateWheelSpd(ctrl.out);
}
const MAX_ITERATION = 1000;
const MAX_ERR = 1e-12;
function newton(p0: number, f: (x: number) => number, df_dx: (x: number) => number) {
	let p = p0;
	// printf(" %3s  %-20s %-20s\n", "i", "p0", "p");
	for (let i = 0; i < MAX_ITERATION; i++) {
		p = p0 - f(p0) / df_dx(p0);
		// printf(" %3d  %-20.16Lf %-20.16Lf\n", i, p0, p);
		if (Math.abs(p - p0) < MAX_ERR) return p;
		p0 = p;
	}
	return p;
}
function updateWheelSpd(deltaX: number) {
	// debugger
	const { left, right } = wheelSpeed;
	const avgSpd = wheelMaxSpeed * (left + right) / 200;
	const isInvalid = left + right == 0 || right - left == 0;
	let newLeft = maxspd, newRight = maxspd;
	if (isInvalid) {
		if (deltaX != 0)
			if (deltaX > 0) newLeft = 0;
			else newRight = 0;
	} else {
		const ratio = (left + right) / (right - left);
		const distCovered = avgSpd * dt; // s = vt
		const newRatio = 2 * newton(ratio,
			x => Math.tan(1 / x) - distCovered / (x - deltaX),
			x => -1 / x ** 2 * Math.cos(1 / x) ** 2 + distCovered / (x - deltaX) ** 2
		)
		console.log({ deltaX, left, right, newRatio });
		if (deltaX != 0)
			if (deltaX > 0) newLeft = newRight * (1 + newRatio) / (newRatio - 1);
			else newRight = newLeft * (newRatio - 1) / (1 + newRatio);
	}

	setSpeed(newLeft || 0, newRight || 0);
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
	Runtime.tps = 1000 / (Runtime.ticks.totalTime / Runtime.ticks.count) || 0;
	Runtime.fps = 1000 / (Runtime.frames.totalTime / Runtime.frames.count) || 0;
	Runtime.ticks.totalTime = 0;
	Runtime.frames.totalTime = 0;
	Runtime.ticks.count = 0;
	Runtime.frames.count = 0;
}

const logicRuntime = createRuntime(Runtime.expectTPS, Runtime.ticks, logic)
const renderRuntime = createRuntime(Runtime.expectFPS, Runtime.frames, render)
const rateRuntime = createRuntime(1, null, rateFunction)
const carRuntime = createRuntime(200, null, carCPU)
// render(60)