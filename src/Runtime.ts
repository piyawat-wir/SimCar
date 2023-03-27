
export interface RuntimeValues {
	totalTime: number
	count: number
	stop: boolean
	start: boolean
}

export interface RuntimeTicker {
	tick: () => Promise<void>
}

export default class Runtime {
	public rate: number = 0;
	public values: RuntimeValues = { count: 0, totalTime: 0, stop: false, start: false };

	constructor(rate: number, func: (stop: void) => Promise<void>) {
		createRuntime(rate, this.values, func);
	}

	public stop() { this.values.stop = true }
	public start() { this.values.start = true }
}

export function createRuntime(rate: number, rval: RuntimeValues, func: () => Promise<void>) {
	return new Promise<void>(
		async (stop) => {
			while(!rval.start)
				await new Promise<void>(resolve => setTimeout(resolve, 100))
			let remain = 0;
			let now = 0;
			let msPerLoop = 1000 / rate;
			while (!rval.stop) {
				now = Date.now();
				await func();
				if (rval) {
					rval.count++;
					rval.totalTime += remain > 0 ? msPerLoop : msPerLoop - remain;
				}
				remain = msPerLoop - (Date.now() - now);
				await new Promise(resolve => setTimeout(resolve, Math.max(0, remain)));
			}
		}
	)
}