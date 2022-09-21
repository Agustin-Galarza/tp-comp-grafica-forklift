export type HangarSize = {
	width: number; // x
	length: number; // z
	height: number; // y
};

let hangar: Hangar | undefined = undefined;

export type Hangar = {
	size: HangarSize;
	isOutOfBounds: (point: HangarCoordinates) => boolean;
	isOutOfBoundsX: (x: number) => boolean;
	isOutOfBoundsY: (x: number) => boolean;
};

export type HangarCoordinates = {
	x: number; // <-> width
	y: number; // <-> length
};

function createHangar(size: HangarSize) {
	let _size = size;

	function isOutOfBoundsX(x: number) {
		return Math.abs(x) > _size.width / 2;
	}
	function isOutOfBoundsY(y: number) {
		return Math.abs(y) > _size.length / 2;
	}
	function isOutOfBounds(point: HangarCoordinates) {
		return isOutOfBoundsX(point.x) || isOutOfBoundsY(point.y);
	}
	hangar = {
		size: _size,
		isOutOfBounds,
		isOutOfBoundsX,
		isOutOfBoundsY,
	};
	return hangar;
}

function getHangar() {
	return hangar;
}

export { createHangar, getHangar };
