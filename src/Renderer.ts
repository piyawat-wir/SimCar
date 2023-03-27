import App from "./App";
import { Vector2 } from "./Vector2";

export default class Renderer {
	public pixelPerUnit = 2;
	public ctx: CanvasRenderingContext2D;
	public cv: HTMLCanvasElement;
	private app: App;

	constructor(app: App) {
		this.app = app;
		this.ctx = app.context;
		this.cv = app.canvas;
	}

	public getBackgroundAt(x: number, y: number, w: number, h: number) {
		const { ctx, cv } = this;
		let pos = new Vector2(x, y);
		pos = new Vector2(cv.width / 2, cv.height / 2).add(new Vector2(pos.x, -pos.y));
		pos = pos.sub(new Vector2(w / 2, h / 2));
		return ctx.getImageData(Math.round(pos.x), Math.round(pos.y), w, h)
	}

	public drawPoint(v: Vector2) {
		const { ctx, pixelPerUnit: s } = this;
		const { data } = this.getBackgroundAt(s * v.x, s * v.y, 1, 1);
		const color = data.slice(0, -1).map(v => 255 - v);
		ctx.fillStyle = `rgba(${color})`;
		ctx.fillRect(s * v.x - 3, s * v.y - 3, 6, 6);
	}

	public async render() {
		for (let obj of this.app.objects)
			await obj.render();
	}
	public async renderRelative() {
		for (let obj of this.app.objects)
			await obj.renderRelative();
	}
}

export interface RendererInterface {
	render: () => Promise<void>;
	renderRelative: () => Promise<void>;
}