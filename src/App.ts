import Car from './Car';
import { rotateVector } from './lib';
import Renderer, { RendererInterface } from './Renderer';
import Runtime from './Runtime';
import trackImgSrc from './trackA.png'
import { Vector2 } from './Vector2'
import CarCPU from './carCPU'

export default class App implements RendererInterface {

	private ctx: CanvasRenderingContext2D;
	private cv: HTMLCanvasElement;
	private trackImg: HTMLImageElement;

	private renderer: Renderer;

	private car: Car = new Car();
	private objs: RendererInterface[] = [];

	private carCPU: CarCPU;

	private runtime: Record<string, Runtime> = {}

	constructor() {
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

		this.cv = cv;
		this.ctx = ctx;
		this.trackImg = trackImg;
		this.objs.push(this)

		this.carCPU = new CarCPU(this);

		this.renderer = new Renderer(this);
		this.initRuntime();
	}

	get context() { return this.ctx }
	get canvas() { return this.cv }
	get objects() { return this.objs }

	private readSensor(car: Car) {
		const { pixelPerUnit: s } = this.renderer;
		const size = 2 * s;
		car.sensorValue = car.absoluteSersorVertices.map(sv => {
			let pos = sv.scale(s);
			const { data } = this.renderer.getBackgroundAt(pos.x, pos.y, size, size);
			let sum = 0;
			for (let i = 0; i < data.length; i += 4) {
				const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
				sum += brightness > 127 ? 1 : 0;
			}
			const avg = sum / (data.length / 4)
			return avg >= 0.5 ? 0 : 1;
		})
	}
	private drawCar(car: Car) {
		const { ctx, pixelPerUnit: s } = this.renderer;
		const vert = car.absoluteVertices;
		ctx.beginPath();
		ctx.moveTo(s * vert[0].x, s * vert[0].y);
		vert.forEach((v, i) => {
			const j = (i + 1) % 4;
			ctx.lineTo(s * vert[j].x, s * vert[j].y);
		})
		ctx.fillStyle = "rgba(220, 80, 126, 0.9)"
		ctx.fill();

		this.renderer.drawPoint(car.position)
	}
	private drawSensors(car: Car) {
		car.absoluteSersorVertices.forEach((v, i) => this.renderer.drawPoint(v))
	}

	public async render() {
		const { renderer } = this;
		const { ctx, cv } = renderer;
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, cv.width, cv.height);

		ctx.font = "20px Tahoma"
		ctx.textBaseline = "top"
		ctx.fillStyle = "black";
		ctx.fillText(`${this.car.sensorValue}`, 10, 10)
		ctx.fillText(`FPS: ${this.runtime.render.rate.toFixed(2)}`, 10, 35)
		ctx.fillText(`TPS: ${this.runtime.logic.rate.toFixed(2)}`, 10, 60)
		let i = 0;
		const { ctrl } = this.carCPU;
		for (let v in ctrl) {
			ctx.fillText(`${v}: ${ctrl[v as keyof typeof ctrl].toFixed(2)}`, 10, 85 + i)
			i += 25;
		}

		const { wheelSpeed } = this.car;
		ctx.fillText(`left: ${wheelSpeed.left.toFixed(2)}`, 10, 260)
		ctx.fillText(`right: ${wheelSpeed.right.toFixed(2)}`, 10, 285)
	}
	public async renderRelative() {
		const { renderer, trackImg } = this;
		const { ctx, cv } = renderer;
		ctx.translate(cv.width / 2, cv.height / 2);
		ctx.drawImage(trackImg, - trackImg.width / 2, -trackImg.height / 2);
		ctx.scale(1, -1);
		this.readSensor(this.car);
		this.drawCar(this.car);
		this.drawSensors(this.car);
		ctx.scale(1, -1);
		ctx.translate(-cv.width / 2, -cv.height / 2);
	}

	private initRuntime() {
		const c = 1
		const runtime = {
			logic: new Runtime(120*c, (stop) => this.logicRuntime(stop, this)),
			render: new Runtime(120*c, (stop) => this.renderRuntime(stop, this)),
			rater: new Runtime(1, (stop) => this.raterRuntime(stop, this)),
			carCPU: new Runtime(100*c, (stop) => this.carCPU.loop())
		}
		this.runtime = runtime;

		this.car.position.x = 157
		this.car.position.y = -100
		this.carCPU.start()
		for (let name in runtime)
			runtime[name as keyof typeof runtime].start();
	}
	private async logicRuntime(stop: void, app: App) {
		const { wheelSpeed, maxSpeed, halfWheelDistance } = app.car;
		const { left, right } = wheelSpeed;
		const { rate: tps } = app.runtime.logic;

		this.car.tick();

		const avgSpd = maxSpeed * (left + right) / 200;
		const dt = tps ? tps / 1000 : 0;
		const ratio = (left + right) / (right - left);
		const radius = ratio * halfWheelDistance;
		const distCovered = avgSpd * dt; // s = vt
		const radCovered = distCovered / (ratio * halfWheelDistance);
		const isInvalid = radCovered == 0 || radius == 0 || left == right;
		const xAdd = isInvalid ? 0 : radius - radius * Math.cos(radCovered);
		const yAdd = isInvalid ? distCovered : radius * Math.sin(radCovered);
		const posAdd = rotateVector(new Vector2(xAdd, yAdd), app.car.rotation);

		app.car.position = app.car.position.add(posAdd);
		if (Number.isFinite(radCovered)) app.car.rotation += radCovered;
		else {
			const wheelRad_per_dt = maxSpeed * (right / 800);
			const rad = wheelRad_per_dt * dt; // s = vt
			app.car.rotation += rad;
		}
	}
	private async renderRuntime(stop: void, app: App) {
		app.renderer.render();
		app.renderRelative();
	}
	private async raterRuntime(stop: void, app: App) {
		const logic = app.runtime.logic.values;
		const render = app.runtime.render.values;

		app.runtime.logic.rate = 1000 / (logic.totalTime / logic.count) || 0;
		app.runtime.render.rate = 1000 / (render.totalTime / render.count) || 0;

		logic.totalTime = 0;
		logic.count = 0;
		render.totalTime = 0;
		render.count = 0;
	}

	public carControl = {
		setSpeed: (left: number, right: number) => {
			this.car.setSpeed.call(this.car, left, right);
		},
		getSensorValue: (i: number) => this.car.sensorValue[i]
	}

}