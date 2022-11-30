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
import { getOwnModel } from './forkliftOwnModel';
import { EventType, updateCamera, UpdateData } from './updater';
import { isKeyPressed, Key, keyActionCompleted } from './keyControls';
import { FigureHolder, canTakeFigure } from './figures';
import { getGuiStatus } from './main';

const forkliftShininess = 50;

type LiftRange = {
	top: number;
	bottom: number;
};

type CamType = 'first-person' | 'third-person' | 'lateral-view' | undefined;

export type LiftSize = {
	height: number;
	length: number;
};

export type ForkliftSize = {
	length: number;
	width: number;
	height: number;
};

export type LiftData = {
	size: LiftSize;
	sensitivity: number;
	range?: LiftRange;
};

export type ForkliftProperties = {
	turnSensitivity: number;
	speed: number;
	size: ForkliftSize;
	lift: LiftData;
	captureThreshold?: number;
};

export type ForkliftType = { new (): Forklift };

let forklift: ForkliftType | undefined = undefined;

function getForklift() {
	return forklift;
}
export class Forklift extends BoxShape implements Moving, FigureHolder {
	private turnSensitivity: number;
	private speed: number;
	private size;
	readonly mesh: Mesh;
	private liftSize: LiftSize;
	private liftRange: LiftRange;
	private liftSensitivity;
	//@ts-ignore
	private hangar: Hangar;
	private deltaMovement: number = 0;
	private figure: Object3D | undefined;
	private captureThreshold;
	private dx: number = 0;
	private dy: number = 0;
	private cameraProperties;
	private camType: CamType;

	constructor({
		turnSensitivity,
		speed,
		size,
		lift,
		captureThreshold = 15,
	}: ForkliftProperties) {
		super(
			new Orientation(),
			size.width,
			size.height,
			size.length + lift.size.length
		);
		this.liftSize = lift.size;
		lift.range = lift.range ?? {
			top: (this.height * 7) / 2,
			bottom: -this.height / 2 + this.liftSize.height / 2,
		};
		this.liftRange = lift.range!;
		this.speed = speed;
		this.hangar = getHangar()!;
		this.size = size;
		this.mesh = generateForkliftMesh(size, lift);
		this.turnSensitivity = turnSensitivity;
		this.liftSensitivity = lift.sensitivity;
		this.figure = undefined;
		this.captureThreshold = captureThreshold;

		this.cameraProperties = {
			firstPerson: {
				camDistance: new Vector3(
					-this.size.length / 6,
					0,
					(this.size.height * 3) / 2
				),
				camTarget: () => {
					const target = new Vector3();

					if (getGuiStatus().forklift.followLift) {
						this.getLift().getWorldPosition(target);
						return target;
					} else {
						this.mesh.getWorldPosition(target);
						return target.add(
							new Vector3(
								10 * Math.cos(this.orientation.value),
								this.size.height + 2,
								-10 * Math.sin(this.orientation.value)
							)
						);
					}
				},
			},
			thirdPerson: {
				camDistance: new Vector3(-30, 0, 20),
				camTarget: () => {
					const target = new Vector3();
					if (getGuiStatus().forklift.followLift) {
						this.getLift().getWorldPosition(target);
						return target;
					} else {
						this.mesh.getWorldPosition(target);
						return target.add(new Vector3(0, this.size.height, 0));
					}
				},
			},
			lateralView: {
				camDistance: new Vector3(0, 40, 0),
				camTarget: () => {
					const target = new Vector3();
					this.mesh.getWorldPosition(target);
					return target;
				},
			},
		} as const;
	}
	updatePosition(dx: number, dy: number): void {
		this.dx += dx;
		this.dy += dy;
	}

	override get position(): Vector2 {
		return new Vector2(this.mesh.position.x, this.mesh.position.y);
	}
	protected override set position(newPos: Vector2) {
		this.mesh.position.setX(newPos.x);
		this.mesh.position.setY(newPos.y);
	}

	accelerate({ dt }: UpdateData) {
		this.mesh.translateX(this.speed * dt);
		this.animateWheels();
	}
	decelerate({ dt }: UpdateData) {
		this.mesh.translateX(-this.speed * dt);
		this.animateWheels(true);
	}
	turnLeft({ dt }: UpdateData) {
		this.orientation.rotate(this.turnSensitivity * dt);
		this.mesh.rotateZ(this.turnSensitivity * dt);
	}
	turnRight({ dt }: UpdateData) {
		this.orientation.rotate(-this.turnSensitivity * dt);
		this.mesh.rotateZ(-this.turnSensitivity * dt);
	}
	liftUp({ dt }: UpdateData) {
		const lift = this.getLift()!;
		if (lift.position.z >= this.liftRange.top) return;
		lift.translateZ(this.liftSensitivity * dt);
	}
	liftDown({ dt }: UpdateData) {
		const lift = this.getLift()!;
		if (lift.position.z <= this.liftRange.bottom) return;
		lift.translateZ(-this.liftSensitivity * dt);
	}
	getAABB(): AABB {
		const liftLen = this.liftSize.length / 2;
		const halfDepth = this.depth / 2;
		const y_vals = [
			(halfDepth + liftLen) * Math.sin(this.orientation.value),
			(halfDepth - liftLen) * Math.sin(this.orientation.value + Math.PI),
		];
		const x_vals = [
			(halfDepth + liftLen) * Math.cos(this.orientation.value),
			(halfDepth - liftLen) * Math.cos(this.orientation.value + Math.PI),
		];
		return {
			xMax: this.position.x + Math.max(...x_vals),
			xMin: this.position.x + Math.min(...x_vals),
			yMax: this.position.y + Math.max(...y_vals),
			yMin: this.position.y + Math.min(...y_vals),
		};
	}

	private onPressedKeys: {
		[key in Key]?: EventType;
	} = {
		w: this.accelerate.bind(this),
		s: this.decelerate.bind(this),
		d: this.turnRight.bind(this),
		a: this.turnLeft.bind(this),
		q: this.liftUp.bind(this),
		e: this.liftDown.bind(this),
		g: this.handleFigure.bind(this),
		Backspace: this.deleteFigure.bind(this),
		4: this.setFirstPersonCamera.bind(this),
		5: this.setThirdPersonCamera.bind(this),
		6: this.setLateralViewCamera.bind(this),
	};

	setThirdPersonCamera(updateData: UpdateData) {
		this.camType = 'third-person';
		updateCamera({
			cameraPosition: this.cameraProperties.thirdPerson.camDistance,
			getTarget: this.cameraProperties.thirdPerson.camTarget.bind(this),
			pov: true,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	setFirstPersonCamera(updateData: UpdateData) {
		this.camType = 'first-person';
		updateCamera({
			cameraPosition: this.cameraProperties.firstPerson.camDistance,
			getTarget: this.cameraProperties.firstPerson.camTarget.bind(this),
			pov: true,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	setLateralViewCamera(updateData: UpdateData) {
		this.camType = 'lateral-view';
		updateCamera({
			cameraPosition: this.cameraProperties.lateralView.camDistance,
			getTarget: this.cameraProperties.lateralView.camTarget.bind(this),
			pov: true,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	hasCamera(): Boolean {
		return this.mesh.getObjectByName('camera') != undefined;
	}

	getCamType(): CamType {
		return this.hasCamera() ? this.camType : undefined;
	}

	update(updateData: UpdateData) {
		this.mesh.position.x += this.dx;
		this.dx = 0;
		this.mesh.position.y += this.dy;
		this.dy = 0;

		Object.entries(this.onPressedKeys).forEach(entry => {
			const key = entry[0] as Key;
			const action = entry[1];
			if (isKeyPressed[key]) {
				action(updateData);
			}
		});

		const camType = this.getCamType();
		if (camType === 'first-person' || camType === 'third-person') {
			updateData.camera.lookAt(this.cameraProperties.firstPerson.camTarget());
		}
	}
	private handleFigure(updateData: UpdateData) {
		updateData.entities.forEach(entity => {
			if (entity === this) return;
			if (this.figure !== undefined) {
				if (canTakeFigure(entity)) {
					this.giveFigure(entity);
					keyActionCompleted('g');
				}
			}
		});
	}
	private getLift(): Mesh {
		return this.mesh.getObjectByName('lift') as Mesh;
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
	giveFigure(holder: FigureHolder): void {
		if (!this.figure) return undefined;

		const newFigPos = this.computeFigureGlobalPosition()!;
		const newFig = this.figure.clone();
		newFig.position.set(newFigPos.x, newFigPos.y, newFigPos.z);
		if (holder.takeFigure(newFig)) {
			this.deleteFigure();
		}
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

	deleteFigure() {
		if (!this.figure) return;
		this.getLift()!.remove(this.figure);
		this.figure = undefined;
	}
}

function createForklift(properties: ForkliftProperties) {
	return new Forklift(properties);
}

/****************************************************
| 				Mesh							  	|
****************************************************/

function generateForkliftMesh(forkliftSize: ForkliftSize, liftData: LiftData) {
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
	const bodyMesh = getOwnModel(forkliftSize, liftData.size);

	//lift
	const poleSize = liftData.size.length * 0.15;
	geometry = new THREE.BoxGeometry(
		forkliftSize.width,
		liftData.size.height,
		liftData.size.length - poleSize
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
		forkliftSize.length / 2 + liftData.size.length / 2 + poleSize / 2
	);

	// / poles
	const poleHeight = (liftData.range!.top - liftData.range!.bottom) * 1.1;
	geometry = new BoxGeometry(poleSize, poleHeight, poleSize);
	material = new MeshPhongMaterial({
		color: 0x9eb1b8,
		shininess: forkliftShininess * 2,
	});
	let poleMesh = new Mesh(geometry, material);
	poleMesh.rotateX(-Math.PI / 2);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);
	poleMesh.translateY(-poleHeight / 2 - liftData.range!.bottom * 1.2);
	poleMesh.translateZ((-forkliftSize.width / 2) * 0.6);

	poleMesh = new Mesh(geometry, material);
	poleMesh.rotateX(-Math.PI / 2);
	bodyMesh.add(poleMesh);
	poleMesh.translateX(forkliftSize.length / 2 + poleSize / 2);
	poleMesh.translateY(-poleHeight / 2 - liftData.range!.bottom * 1.2);
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
