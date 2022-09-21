import * as THREE from 'three';
import { Mesh } from 'three';

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
	mesh: Mesh;
};

export type HangarCoordinates = {
	x: number; // <-> width
	y: number; // <-> length
};

function createHangar(size: HangarSize) {
	let _mesh = generateHangarMesh(size);
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
		mesh: _mesh,
	};
	return hangar;
}

function getHangar() {
	return hangar;
}

function generateHangarMesh(size: HangarSize): Mesh {
	// create floor mesh
	let geo = new THREE.PlaneBufferGeometry(size.width, size.length, 100, 100);
	let mat = new THREE.MeshStandardMaterial({
		color: 0x8b5a2b,
	});
	let floorMesh = new Mesh(geo, mat);

	floorMesh.rotateX(-Math.PI / 2);

	floorMesh.add(new THREE.AxesHelper(5));

	//create walls
	for (let i = 0; i < 4; i++) {
		let width,
			height = size.height;
		if (i % 2 == 0) {
			width = size.width;
		} else {
			width = size.length;
		}
		geo = new THREE.PlaneBufferGeometry(width, height, 100, 100);
		mat = new THREE.MeshStandardMaterial({
			color: 0xa2b7db,
		});
		let wallMesh = new Mesh(geo, mat);
		floorMesh.add(wallMesh);
		if (i % 2 == 0) {
			wallMesh.rotateX(((i < 2 ? 1 : -1) * Math.PI) / 2);
			wallMesh.translateZ(-size.length / 2);
		} else {
			wallMesh.rotateX(Math.PI / 2);
			wallMesh.rotateY(((i < 2 ? 1 : -1) * Math.PI) / 2);
			wallMesh.translateZ(-size.width / 2);
		}
		wallMesh.position.z = height / 2;
	}
	// TODO: roof

	return floorMesh;
}

export { createHangar, getHangar };
