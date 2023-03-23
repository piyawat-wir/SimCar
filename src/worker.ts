onmessage = e => {
	const message = e.data as string;
	if (message === "start") start();
	postMessage("done")
}

function start() {
	// console.log('start!')
	for (let i = 0; i < 10; i++);
	// console.log('end')
}