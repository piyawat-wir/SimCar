import App from "./App";
import { constrain } from "./lib";

export default class CarCPU {

	public setSpeed = (left: number, right: number) => { };
	public getSensorValue = (i: number) => 0;

	constructor(app: App) {
		this.setSpeed = app.carControl.setSpeed
		this.getSensorValue = app.carControl.getSensorValue
	}

	public gain = {
		kP: 32, //65
		kI: 0.22, // 0.001
		kD: 96, //95
	}
	public ctrl = {
		err: 0,
		P: 0,
		I: 0,
		D: 0,
		oldI: 0,
		oldErr: 0,
		out: 0
	}

	public maxspd = 100;
	public spd = this.maxspd;

	private oldDiscreteError = 0;
	private getDiscreteError() {
		const left = this.getSensorValue(0);
		const mid = this.getSensorValue(1);
		const right = this.getSensorValue(2);
		const errorType = parseInt(`${left}${mid}${right}`, 2)

		const errValue: number[] = []

		errValue[0b001] = -1.0;
		errValue[0b011] = -0.5;
		errValue[0b010] = 0.0;
		errValue[0b110] = 0.5;
		errValue[0b100] = 1.0;

		const errorCap = 3;
		const errorAddMultipler = 0.12;
		const oldError = this.oldDiscreteError;
		const neg = oldError / Math.abs(oldError) || 0
		const moreError = constrain(oldError + neg * errorAddMultipler, -errorCap, errorCap);
		errValue[0b101] = moreError;
		errValue[0b111] = moreError;
		errValue[0b000] = moreError;

		const error = errValue[errorType];
		this.oldDiscreteError = error;

		return error;
	}

	private errorHistory = [0, 0, 0, 0, 0, 0];
	private n = this.errorHistory.length;
	private dt = 1; // iteration time
	private sum_t = (() => { const { n, dt } = this; return -(n / 2) * (n - 1) * dt })()
	private sum_t2 = (() => { const { n, dt } = this; return (n * (n - 1) * (2 * n - 1) / 6) * dt })()
	private calculateErrorFunc() {
		const { errorHistory, n, sum_t, sum_t2, dt } = this;

		const sum_x = errorHistory.reduce((a, b) => a + b, 0);
		const sum_tx = errorHistory.reduce((a, b, i) => a + (-i * dt * b), 0);
		const denominator = n * sum_t2 - sum_t ** 2;
		const A = (n * sum_tx - sum_t * sum_x) / denominator;
		const B = (sum_x * sum_t2 - sum_t * sum_tx) / denominator;
		const E = (t: number) => A * t + B;
		return E;
	}

	private getSimpleError() {
		const left = this.getSensorValue(0);
		const mid = this.getSensorValue(1);
		const right = this.getSensorValue(2);

		const s = (left - right) * (2 - mid);
		return s
	}

	public async start() {
		this.setSpeed(100, 100);
	}

	public async loop() {
		const { ctrl, maxspd, dt } = this;

		this.setSpeed(maxspd - ctrl.out, maxspd + ctrl.out);
		this.calcErr();
		this.calcPID();

		// await sleep(dt)
	}
	private calcErr() {
		const { ctrl } = this;
		const currentErr = this.getDiscreteError();
		this.errorHistory = [currentErr, ...this.errorHistory.slice(0, -1)];
		const E = this.calculateErrorFunc();
		const nextNth = 4;
		ctrl.err = E(nextNth);
	}
	private calcPID() {
		const { ctrl, gain, dt } = this;
		const { err, oldErr, oldI } = ctrl;
		const { kP, kI, kD } = gain;
		ctrl.P = err;
		ctrl.I = err == 0 ? ctrl.I*0.8 : (oldI + err * dt);
		ctrl.D = (err - oldErr) / dt;
		const { P, I, D } = ctrl;
		ctrl.out = kP * P + kI * I + kD * D;
		ctrl.oldErr = err;
		ctrl.oldI = I;
	}
}