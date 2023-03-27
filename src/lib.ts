import { Vector2 } from "./Vector2";

export const constrain = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export const rotateVector = (v: Vector2, rad: number) => new Vector2(
	v.x * Math.cos(rad) - v.y * Math.sin(rad),
	v.x * Math.sin(rad) + v.y * Math.cos(rad)
)

export const sleep = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms));
