import {
	BoxGeometry,
	Mesh,
	MeshPhongMaterial,
	Object3D,
	TorusGeometry,
	Vector2,
	Vector3,
} from 'three';
import { getHangar, Hangar } from './hangar';

import * as THREE from 'three';
import { AABB, BoxShape, Moving, Orientation } from './collisionManager';
import { Printer } from './printer';
import { getOwnModel } from './forkliftOwnModel';

const forkliftShininess = 50;
type LiftRange = {
	top: number;
	bottom: number;
};

export type LiftSize = {
	height: number;
	length: number;
};

export type ForkliftSize = {
	length: number;
	width: number;
	height: number;
};

export type ForkliftProperties = {
	turnSensitivity: number;
	speed: number;
	liftSensitivity: number;
	size: ForkliftSize;
	liftSize: LiftSize;
	captureThreshold?: number;
};

export type ForkliftType = { new (): Forklift };

let forklift: ForkliftType | undefined = undefined;

function getForklift() {
	return forklift;
}
export class Forklift extends BoxShape implements Moving {
	private turnSensitivity: number;
	private speed: number;
	readonly mesh: Mesh;
	private liftSize: LiftSize;
	private liftRange: LiftRange;
	private liftSensitivity;
	private hangar: Hangar;
	private deltaMovement: number = 0;
	private figure: Object3D | undefined;
	private captureThreshold;
	constructor({
		turnSensitivity,
		speed,
		liftSensitivity,
		size,
		liftSize,
		captureThreshold = 15,
	}: ForkliftProperties) {
		super(
			new Vector2(),
			new Orientation(),
			size.width,
			size.height,
			size.length + liftSize.length
		);
		this.liftSize = liftSize;
		this.liftRange = {
			top: (this.height * 7) / 2,
			bottom: -this.height / 2 + this.liftSize.height / 2,
		};
		this.speed = speed;
		this.hangar = getHangar()!;
		this.mesh = generateForkliftMesh(size, liftSize, this.liftRange);
		this.turnSensitivity = turnSensitivity;
		this.liftSensitivity = liftSensitivity;
		this.figure = undefined;
		this.captureThreshold = captureThreshold;
	}
	getPosition() {
		return this.position;
	}
	accelerate() {
		this.deltaMovement += this.speed;
		this.animateWheels();
	}
	decelerate() {
		this.deltaMovement -= this.speed;
		this.animateWheels(true);
	}
	reset() {
		this.deltaMovement = 0;
	}
	turnLeft() {
		this.orientation.rotate(this.turnSensitivity);
	}
	turnRight() {
		this.orientation.rotate(-this.turnSensitivity);
	}
	liftUp() {
		const lift = this.getLift()!;
		if (lift.position.z >= this.liftRange.top) return;
		lift.translateZ(this.liftSensitivity);
	}
	liftDown() {
		const lift = this.getLift()!;
		if (lift.position.z <= this.liftRange.bottom) return;
		lift.translateZ(-this.liftSensitivity);
	}
	getAABB(): AABB {
		const y_vals = [
			(this.depth / 2.4 + this.liftSize.length) *
				Math.sin(this.orientation.value),
			(this.depth / 2.4) * Math.sin(this.orientation.value + Math.PI),
		];
		const x_vals = [
			(this.depth / 2.4 + this.liftSize.length) *
				Math.cos(this.orientation.value),
			(this.depth / 2.4) * Math.cos(this.orientation.value + Math.PI),
		];
		return {
			xMax: this.position.x + Math.max(...x_vals),
			xMin: this.position.x + Math.min(...x_vals),
			yMax: this.position.y + Math.max(...y_vals),
			yMin: this.position.y + Math.min(...y_vals),
		};
	}
	updatePosition() {
		this.position = new Vector2(this.deltaMovement)
			.rotateAround(new Vector2(), this.orientation.value)
			.add(this.position);

		this.updateMeshPosition();
		return this.position;
	}
	private updateMeshPosition() {
		this.mesh.position.x = this.position.x;
		this.mesh.position.y = this.position.y;
		this.mesh.rotation.z = this.orientation.value;
	}
	private getLift() {
		return this.mesh.getObjectByName('lift');
	}
	private animateWheels(reverse = false) {
		for (let i = 0; i < 4; i++) {
			const wheel = this.mesh.getObjectByName('wheel' + i)!;
			wheel.rotateY((reverse ? -1 : 1) * 0.1);
		}
	}
	takeFigure(object: Object3D): boolean {
		if (this.figure) return false;

		const lift = this.getLift()!;
		let vec = new Vector3();
		lift.getWorldPosition(vec);
		const liftPosition = this.worldPositionToHangarPosition(vec);
		if (liftPosition.distanceTo(object.position) > this.captureThreshold)
			return false;

		this.figure = object;
		const xPosition = 0;
		const yPosition = 0;
		const zPosition = this.liftSize.height / 2;
		this.figure.position.set(xPosition, yPosition, zPosition);

		this.figure.rotateX(Math.PI / 2);
		lift.add(this.figure);
		return true;
	}
	private worldPositionToHangarPosition(pos: Vector3): Vector3 {
		return new Vector3(pos.x, -pos.z, pos.y);
	}
	getFigure(): Object3D | undefined {
		return this.figure;
	}
	computeFigureGlobalPosition() {
		if (!this.figure) return undefined;
		let vec = new Vector3();
		this.getLift()!.getWorldPosition(vec);
		return this.worldPositionToHangarPosition(vec).add(this.figure.position);
	}
	giveFigure(getter: (fig: Object3D) => boolean): void {
		if (!this.figure) return undefined;

		const newFigPos = this.computeFigureGlobalPosition()!;
		const newFig = this.figure.clone();
		newFig.position.set(newFigPos.x, newFigPos.y, newFigPos.z);
		if (getter(newFig)) {
			this.deleteFigure();
			return;
		}
	}
	deleteFigure() {
		if (!this.figure) return;
		this.getLift()!.remove(this.figure);
		this.figure = undefined;
	}
}

function createForklift(properties: ForkliftProperties) {
	return new Forklift(properties);
}

function generateForkliftMesh(
	forkliftSize: ForkliftSize,
	liftSize: LiftSize,
	liftRange: LiftRange
) {
	//body
	let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(
		forkliftSize.width,
		forkliftSize.height,
		forkliftSize.length
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	let material = new THREE.MeshPhongMaterial({
		color: 0xfdda0d,
		shininess: forkliftShininess,
	});
	// const bodyMesh = new THREE.Mesh(geometry, material);
	const bodyMesh = getOwnModel(forkliftSize, liftSize);

	//lift
	const poleSize = liftSize.length * 0.15;
	geometry = new THREE.BoxGeometry(
		forkliftSize.width,
		liftSize.height,
		liftSize.length - poleSize
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	material = new THREE.MeshPhongMaterial({
		color: 0xffbf00,
		shininess: forkliftShininess,
	});
	const liftMesh = new Mesh(geometry, material);
	liftMesh.name = 'lift';
	bodyMesh.add(liftMesh);
	liftMesh.translateX(
		forkliftSize.length / 2 + liftSize.length / 2 + poleSize / 2
	);

	// / poles
	const poleHeight = (liftRange.top - liftRange.bottom) * 1.1;
	geometry = new BoxGeometry(poleSize, poleHeight, poleSize);
	material = new MeshPhongMaterial({
		color: 0x9eb1b8,
		shininess: forkliftShininess * 2,
	});
	let poleMesh = new Mesh(geometry, material);
	poleMesh.rotateX(-Math.PI / 2);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);
	poleMesh.translateY(-poleHeight / 2 - liftRange.bottom * 1.2);
	poleMesh.translateZ((-forkliftSize.width / 2) * 0.6);

	poleMesh = new Mesh(geometry, material);
	poleMesh.rotateX(-Math.PI / 2);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);
	poleMesh.translateY(-poleHeight / 2 - liftRange.bottom * 1.2);
	poleMesh.translateZ((forkliftSize.width / 2) * 0.6);

	geometry = new BoxGeometry(
		poleSize * 1.1,
		forkliftSize.width,
		poleSize * 1.1
	);
	material = new MeshPhongMaterial({
		color: 0x323334,
		shininess: forkliftShininess * 0.5,
	});
	poleMesh = new Mesh(geometry, material);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);

	poleMesh = new Mesh(geometry, material);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);
	poleMesh.translateZ(poleHeight * 0.5);

	//wheels
	const wheelSize = {
		radius: forkliftSize.length / 6,
		width: 0.6,
	};
	for (let i = 0; i < 4; i++) {
		const radialSegments = 14;
		geometry = new THREE.CylinderGeometry(
			wheelSize.radius,
			wheelSize.radius,
			wheelSize.width,
			radialSegments,
			1,
			false
		);
		material = new THREE.MeshPhongMaterial({
			color: 0xafaaad,
			shininess: forkliftShininess,
		});
		const wheelMesh = new Mesh(geometry, material);
		wheelMesh.name = 'wheel' + i;
		bodyMesh.add(wheelMesh);

		wheelMesh.translateX(((i < 2 ? 1 : -1) * forkliftSize.length) / 3);
		wheelMesh.translateY(
			(i % 2 == 0 ? 1 : -1) * (forkliftSize.width / 2 + wheelSize.width / 2)
		);
		wheelMesh.translateZ(-forkliftSize.height / 2);

		const tireWidth = wheelSize.width * 0.8;
		geometry = new TorusGeometry(
			wheelSize.radius,
			tireWidth,
			radialSegments,
			10
		);
		material = new MeshPhongMaterial({
			color: 0x2f2a2d,
			shininess: forkliftShininess,
		});
		const tireMesh = new Mesh(geometry, material);
		wheelMesh.add(tireMesh);
		tireMesh.rotateX(Math.PI / 2);

		bodyMesh.translateZ(tireWidth / 10);
	}

	// seat
	const seatWidth = forkliftSize.width * 0.6;
	const seatDepth = 2.5;
	const seatHeight = 6;
	const reticule = [
		new Vector3(-seatWidth / 2, -seatDepth / 2, 0),
		new Vector3(-seatWidth / 2, seatDepth / 2, 0),
		new Vector3(seatWidth / 2, -seatDepth / 2, 0),
		new Vector3(seatWidth / 2, seatDepth / 2, 0),
		new Vector3(-seatWidth / 2, -seatDepth / 2, seatHeight),
		new Vector3(-seatWidth / 2, -seatDepth / 4, seatHeight),
		new Vector3(seatWidth / 2, -seatDepth / 2, seatHeight),
		new Vector3(seatWidth / 2, -seatDepth / 4, seatHeight),
	];
	const indices = [
		0, 1, 2, 1, 3, 2, 0, 4, 5, 0, 5, 1, 0, 2, 6, 6, 4, 0, 2, 3, 6, 3, 7, 6, 3,
		1, 7, 1, 5, 7, 4, 6, 7, 4, 7, 5,
	];
	let array: number[] = [];
	indices.forEach((i, index) => reticule[i].toArray(array, 3 * index));
	const bodyVerteces = new Float32Array(array);
	geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(bodyVerteces, 3));
	geometry.computeVertexNormals();
	material = new MeshPhongMaterial({
		color: 0x2a2a2a,
		shininess: forkliftShininess,
	});
	const seatMesh = new Mesh(geometry, material);
	bodyMesh.add(seatMesh);
	seatMesh.rotateZ(-Math.PI / 2);
	seatMesh.translateZ(forkliftSize.height / 2);
	seatMesh.translateY(-forkliftSize.length * 0.1);

	bodyMesh.translateZ(forkliftSize.height / 2 + wheelSize.radius);

	return bodyMesh;
}

export { createForklift, getForklift };
