import { Mesh, Object3D, Vector2 } from 'three';
import { getHangar, Hangar } from './hangar';

import * as THREE from 'three';
import { AABB, BoxShape, Moving, Orientation } from './collisionManager';
import { Printer } from './printer';

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
	constructor(properties: ForkliftProperties) {
		super(
			new Vector2(),
			new Orientation(),
			properties.size.width,
			properties.size.height,
			properties.size.length + properties.liftSize.length
		);
		this.liftSize = properties.liftSize;
		this.liftRange = {
			top: (this.height * 3) / 2,
			bottom: -this.height / 2 + this.liftSize.height / 2,
		};
		this.speed = properties.speed;
		this.hangar = getHangar()!;
		this.mesh = generateForkliftMesh(properties.size, properties.liftSize);
		this.turnSensitivity = properties.turnSensitivity;
		this.liftSensitivity = properties.liftSensitivity;
		this.figure = undefined;
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
	takeFigure(printer: Printer) {
		if (this.figure) return;
		this.figure = printer.giveFigure();
		if (!this.figure) return;

		const lift = this.getLift()!;

		const xPosition = 0;
		const yPosition = 0;
		const zPosition = this.liftSize.height / 2;
		this.figure.position.set(xPosition, yPosition, zPosition);

		this.figure.rotateX(Math.PI / 2);
		lift.add(this.figure);
	}
}

function createForklift(properties: ForkliftProperties) {
	return new Forklift(properties);
}

function generateForkliftMesh(forkliftSize: ForkliftSize, liftSize: LiftSize) {
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
	const bodyMesh = new THREE.Mesh(geometry, material);

	//lift
	geometry = new THREE.BoxGeometry(
		forkliftSize.width,
		liftSize.height,
		liftSize.length
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
	liftMesh.translateX(forkliftSize.length / 2 + liftSize.length / 2);

	//wheels
	const wheelSize = {
		radius: forkliftSize.length / 6,
		width: 0.4,
	};
	for (let i = 0; i < 4; i++) {
		geometry = new THREE.CylinderGeometry(
			wheelSize.radius,
			wheelSize.radius,
			wheelSize.width,
			14,
			1,
			false
		);
		material = new THREE.MeshPhongMaterial({
			color: 0x2f2a2d,
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
	}

	bodyMesh.translateZ(forkliftSize.height / 2 + wheelSize.radius);

	return bodyMesh;
}

export { createForklift, getForklift };
