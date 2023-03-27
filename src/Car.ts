import { constrain, rotateVector } from "./lib";
import { RuntimeTicker } from "./Runtime";
import { Vector2 } from "./Vector2";

export default class Car implements RuntimeTicker {
	public position: Vector2 = new Vector2; // cm
	public rotation: number = 0; // radian
	public size: Vector2 = new Vector2; //cm 

	// percentage of each wheel speed
	public wheelSpeed = { left: 0, right: 0 }
	public expectSpeed = { left: 0, right: 0 }

	public maxSpeed = 10 // maximum speed of the car in cm/s
	public wheelDistance = 15; // distance between wheels in cm
	public halfWheelDistance = this.wheelDistance / 2;
	public sensorDistance = 3 // distance between each sensors in cm

	private vertices: Vector2[] = [
		new Vector2(- this.halfWheelDistance, - this.wheelDistance),
		new Vector2(+ this.halfWheelDistance, - this.wheelDistance),
		new Vector2(+ this.halfWheelDistance, + this.wheelDistance),
		new Vector2(- this.halfWheelDistance, + this.wheelDistance),
	];
	private sensorVertices: Vector2[] = [
		new Vector2(- this.sensorDistance, this.wheelDistance + 1),
		new Vector2(0, this.wheelDistance + 1),
		new Vector2(+ this.sensorDistance, this.wheelDistance + 1),
	];

	public absoluteVertices: Vector2[] = this.vertices;
	public absoluteSersorVertices: Vector2[] = this.sensorVertices;

	public sensorValue: number[] = [];

	constructor() { }

	public setSpeed(left: number, right: number) {
		this.expectSpeed.left = constrain(left, -100, 100);
		this.expectSpeed.right = constrain(right, -100, 100);
	}

	private updateRealSpeed() {
		const delay = 0.1;
		const deltaL = this.expectSpeed.left - this.wheelSpeed.left;
		const deltaR = this.expectSpeed.right - this.wheelSpeed.right;
		this.wheelSpeed.left += delay * deltaL;
		this.wheelSpeed.right += delay * deltaR;
	}
	private calcCarVertPos() {
		const rotated = this.vertices.map(v => rotateVector(v, this.rotation));
		const offset = rotated.map(v => v.add(this.position));
		this.absoluteVertices = offset;
	}
	private calcSensorPos() {
		const rotated = this.sensorVertices.map(v => rotateVector(v, this.rotation));
		const offset = rotated.map(v => v.add(this.position));
		this.absoluteSersorVertices = offset;
	}

	public async tick() {
		this.calcCarVertPos();
		this.calcSensorPos();
		this.updateRealSpeed();
	}
}