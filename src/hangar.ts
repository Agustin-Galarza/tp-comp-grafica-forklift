import * as THREE from 'three';
import { Mesh, Vector2 } from 'three';
import { Room } from './collisionManager';

export type HangarSize = {
	width: number; // x
	length: number; // z
	height: number; // y
};

let hangar: Hangar | undefined = undefined;

export class Hangar extends Room {
	readonly mesh: Mesh;
	constructor(size: HangarSize) {
		super(size.width, size.length, size.height);
		this.mesh = generateHangarMesh(size);
	}
}

function createHangar(size: HangarSize) {
	return new Hangar(size);
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
