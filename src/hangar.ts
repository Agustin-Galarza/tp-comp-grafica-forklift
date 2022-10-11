import * as THREE from 'three';
import {
	BufferGeometry,
	CylinderGeometry,
	Material,
	Mesh,
	BackSide,
	Shape,
	CubicBezierCurve,
	ShapeBufferGeometry,
	QuadraticBezierCurve,
} from 'three';
import { Room } from './collisionManager';
import { Vector3, Vector2 } from 'three';

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
	let geo: BufferGeometry = new THREE.PlaneBufferGeometry(
		size.width,
		size.length,
		100,
		100
	);
	let mat: Material = new THREE.MeshStandardMaterial({
		color: 0x826f57,
	});
	let floorMesh = new Mesh(geo, mat);

	floorMesh.rotateX(-Math.PI / 2);
	// floorMesh.rotateZ(-Math.PI / 2);

	// create roof
	const roofHeight = size.height;
	const roofRadius = size.width ** 2 / (8 * roofHeight) + roofHeight / 2;
	const l = size.width / 2;
	const roofHalfAngle = Math.atan(l / (roofRadius - roofHeight));
	// const roofHalfAngle = Math.PI;
	geo = new CylinderGeometry(
		roofRadius,
		roofRadius,
		size.length,
		100,
		10,
		true,
		-roofHalfAngle,
		roofHalfAngle * 2
	);
	mat = new THREE.MeshStandardMaterial({
		color: 0xc1dbe5,
	});
	mat.side = BackSide;
	let roofMesh = new Mesh(geo, mat);

	floorMesh.add(roofMesh);
	roofMesh.position.set(0, 0, -(roofRadius - size.height - roofHeight));

	//create walls
	for (let i = 0; i < 4; i++) {
		let width,
			height = size.height;
		if (i % 2 == 0) {
			width = size.width;
		} else {
			width = size.length;
		}
		mat = new THREE.MeshStandardMaterial({
			color: 0xa2b7db,
		});
		geo = new THREE.PlaneBufferGeometry(width, height, 100, 100);
		let wallMesh = new Mesh(geo, mat);
		if (i % 2 == 0) {
			const topWallMesh = new Mesh(
				createWallTopGeometry(roofHeight, size.width),
				mat
			);

			topWallMesh.translateY((i < 2 ? 1 : -1) * roofHeight);
			if (i >= 2) {
				topWallMesh.rotateZ(Math.PI);
			}
			wallMesh.add(topWallMesh);
		}

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

	return floorMesh;
}

function createWallTopGeometry(height: number, width: number): BufferGeometry {
	const w2 = width / 2;
	const h2 = height / 2;

	const curve = new QuadraticBezierCurve(
		new Vector2(-w2, -h2),
		new Vector2(0, h2 * 3.1),
		new Vector2(w2, -h2)
	);
	const shape = new Shape().setFromPoints(curve.getPoints(30));
	const geometry = new ShapeBufferGeometry(shape);

	return geometry;
}

export { createHangar, getHangar };
