const parallelKeys: string[] = [];

export type ParallelKey = typeof parallelKeys[number];

type Controller = {
	[key in ParallelKey]: { pressed: boolean; callback: Function };
};

const controller: Controller = {};

function addParallelKeyControl(keyName: string, callback: Function): void {
	if (!parallelKeys.includes(keyName)) parallelKeys.push(keyName);
	controller[keyName] = { pressed: false, callback };
}

function removeParallelKeyControl(keyName: string): void {
	delete controller[keyName];
}

function isEventKey(str: string): str is ParallelKey {
	return str in controller;
}

document.addEventListener('keydown', function (event) {
	if (isEventKey(event.key)) {
		controller[event.key].pressed = true;
	}
});
document.addEventListener('keyup', function (event) {
	if (isEventKey(event.key)) {
		controller[event.key].pressed = false;
	}
});

function resolveKeys(): void {
	Object.keys(controller).forEach(key => {
		if (isEventKey(key) && controller[key].pressed) controller[key].callback();
	});
}

const keyController = {
	addParallelKeyControl,
	removeParallelKeyControl,
	resolveKeys,
};

export default keyController;
