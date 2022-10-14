const parallelKeys: string[] = [];

export type ParallelKey = typeof parallelKeys[number];

const keys = [
	'a',
	'd',
	'w',
	's',
	'c',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'q',
	'e',
	'u',
	'g',
	'Backspace',
	'o',
	'p',
	't',
] as const;

export type Key = typeof keys[number];

type Controller = {
	[key in ParallelKey]: { pressed: boolean; callback: Function };
};

type KeyPressed = {
	[key in Key]: boolean;
};

// @ts-ignore
const isKeyPressed: KeyPressed = {};
keys.forEach(k => (isKeyPressed[k] = false));

const controller: Controller = {};

function addParallelKeyControl(keyName: string, callback: Function): void {
	if (!parallelKeys.includes(keyName)) parallelKeys.push(keyName);
	controller[keyName] = { pressed: false, callback };
}

function removeParallelKeyControl(keyName: string): void {
	delete controller[keyName];
}

function isEventKey(str: string): str is Key {
	return keys.includes(str as Key);
}

document.addEventListener('keydown', function (event) {
	if (isEventKey(event.key)) {
		isKeyPressed[event.key] = true;
	}
});
document.addEventListener('keyup', function (event) {
	if (isEventKey(event.key)) {
		isKeyPressed[event.key] = false;
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
export { isKeyPressed };
