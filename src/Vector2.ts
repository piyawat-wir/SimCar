export class Vector2 {
	x: number;
	y: number;
	constructor(x = 0, y = 0) {
		this.x = x; this.y = y;
	}
	clone() { return new Vector2(this.x, this.y); }
	add(v: Vector2) { return new Vector2(this.x + v.x, this.y + v.y); }
	sub(v: Vector2) { return new Vector2(this.x - v.x, this.y - v.y); }
	scale(n: number) { return new Vector2(this.x * n, this.y * n); }
	dist(v: Vector2) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); }
	equals(v: Vector2) { return this.x == v.x && this.y == v.y; }

	toString() { return `(${this.x}, ${this.y})` }
}