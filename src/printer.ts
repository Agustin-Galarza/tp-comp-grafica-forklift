import {
	BoxGeometry,
	BufferGeometry,
	ColorRepresentation,
	CylinderGeometry,
	Event,
	Group,
	Material,
	Mesh,
	MeshPhongMaterial,
	Object3D,
	Plane,
	TorusGeometry,
	Vector2,
	Vector3,
} from 'three';
import { BoxShape, Orientation } from './collisionManager';
import { FigureName, getFigure, FigureHolder, canTakeFigure } from './figures';
import { isKeyPressed, Key, keyActionCompleted } from './keyControls';
import { UpdateData, EventType, updateCamera } from './updater';
import { getGuiStatus, getPrintFigureData } from './main';

export type PrinterSize = {
	radius: number;
	height: number;
};

const headName = 'head';
const poleName = 'pole';

export type PrintFigureData = {
	type: FigureName;
	height: number;
	extrusionAngle: number;
	color?: ColorRepresentation;
};

export class Printer extends BoxShape implements FigureHolder {
	readonly mesh: Mesh;
	private figure: Object3D | undefined = undefined;
	//@ts-ignore
	private maxFigureHeight: number;
	private printing: boolean = false;
	private headMoving: boolean = false;
	private clippingPlane: Plane = new Plane(new Vector3(0, -1, 0), 0);
	private cameraProperties;

	constructor(
		position: Vector2,
		size: PrinterSize,
		maxFigureHeight: number = 15
	) {
		super(new Orientation(), size.radius * 2, size.height, size.radius * 2);
		this.maxFigureHeight = maxFigureHeight;
		this.mesh = generatePrinterMesh(size, maxFigureHeight);
		const headWorldPosition = new Vector3();
		const head = this.mesh.getObjectByName(headName)!;
		head.getWorldPosition(headWorldPosition);
		this.clippingPlane.translate(
			new Vector3(0, headWorldPosition.z + this.height / 2, 0)
		);
		this.cameraProperties = {
			camDistance: new Vector3(40, 40, 40),
			camTarget: () => {
				var target = new Vector3();
				this.mesh.getWorldPosition(target);
				target.y += this.height / 2 + getGuiStatus().printer.figureHeight / 2;
				return target;
			},
		};

		this.moveHeadToBase(() => {});
	}
	get position(): Vector2 {
		return new Vector2(this.mesh.position.x, this.mesh.position.y);
	}
	set position(newPos: Vector2) {
		this.mesh.position.setX(newPos.x);
		this.mesh.position.setY(newPos.y);
	}
	generateFigure({ type, height, extrusionAngle, color }: PrintFigureData) {
		if (this.figure || this.headMoving) return;

		this.mesh.geometry.computeBoundingBox();
		let sizeVec = new Vector3();
		this.mesh.geometry.boundingBox!.getSize(sizeVec);

		this.figure = getFigure(
			type,
			sizeVec.x * 0.8,
			height,
			extrusionAngle,
			color,
			this.clippingPlane
		);
		this.startPrinting(height);

		this.figure.name = 'figure';

		this.figure.position.set(0, this.height / 2, 0);

		this.mesh.add(this.figure);
	}
	canPickFigure() {
		return !this.printing && this.figure && !this.headMoving;
	}
	moveHead(distance: number, steps: number, andThen: Function) {
		if (steps === 0) {
			andThen();
			this.headMoving = false;
			return;
		}
		this.headMoving = true;
		const head: Object3D = this.mesh.getObjectByName(headName)!;
		const stepDistance = distance / steps;
		head.translateY(stepDistance);
		this.clippingPlane.translate(new Vector3(0, stepDistance, 0));
		setTimeout(() => {
			this.moveHead(distance - stepDistance, steps - 1, andThen);
		}, 0.1);
	}
	onPressedKeys: {
		[key in Key]?: EventType;
	} = {
		u: _ => this.generateFigure(getPrintFigureData()),
		g: this.handleFigure.bind(this),
		Backspace: this.deleteFigure.bind(this),
		2: this.setPrinterCamera.bind(this),
	};

	setPrinterCamera(updateData: UpdateData) {
		updateCamera({
			cameraPosition: this.cameraProperties.camDistance,
			getTarget: this.cameraProperties.camTarget.bind(this),
			pov: false,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	handleFigure(updateData: UpdateData) {
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
	update(updateData: UpdateData) {}

	moveHeadToBase(andThen: Function) {
		const pole: Object3D = this.mesh.getObjectByName(poleName)!;
		const head: Object3D = this.mesh.getObjectByName(headName)!;

		const distanceToBase =
			this.height / 2 - (head.position.y + pole.position.y) + 0.6;
		const steps = 200;

		this.moveHead(distanceToBase, steps, andThen);
	}
	printFigure(height: number, andThen: Function) {
		const pole: Object3D = this.mesh.getObjectByName(poleName)!;
		const head: Object3D = this.mesh.getObjectByName(headName)!;

		const distanceToBase =
			this.height / 2 + height - (head.position.y + pole.position.y) + 0.6;
		const steps = 500;

		this.moveHead(distanceToBase, steps, andThen);
	}
	startPrinting(height: number) {
		this.printing = true;

		const prepareFigure: Function = () => {
			const material = (this.figure! as Mesh).material as Material;
			material.clippingPlanes = null;
			this.printing = false;
		};
		this.printFigure(
			Math.min(height + 3, this.maxFigureHeight),
			prepareFigure.bind(this)
		);
	}
	takeFigure(figure: Object3D<Event>): boolean {
		return false;
	}
	giveFigure(holder: FigureHolder): void {
		if (!this.canPickFigure()) return undefined;

		const newFigPos = this.computeFigureGlobalPosition()!;
		const newFig = this.figure!.clone();
		newFig.position.set(newFigPos.x, newFigPos.y, newFigPos.z);
		if (holder.takeFigure(newFig)) {
			this.deleteFigure();
		}
	}
	computeFigureGlobalPosition() {
		if (!this.figure) return undefined;
		return new Vector3(
			this.position.x,
			this.position.y,
			this.figure.position.z
		);
	}
	getFigure() {
		return this.figure;
	}
	deleteFigure() {
		if (!this.figure) return;
		this.mesh.remove(this.figure);
		this.figure = undefined;
		this.moveHeadToBase(() => {});
	}
}

function createPrinter(
	position: Vector2,
	size: PrinterSize,
	maxFigureHeight: number
) {
	const printer = new Printer(position, size, maxFigureHeight);
	printer.mesh.position.set(position.x, position.y, size.height / 2);
	return printer;
}

function generatePrinterMesh(size: PrinterSize, maxFigureHeight: number) {
	const shininess = 20;
	const radialSegments = 8;
	const platformHeight = 0.5;
	const poleWidth = 0.4;
	const poleHeight = size.height + maxFigureHeight + 3;
	const ringWidth = size.radius / 10;
	//create body
	let geometry: BufferGeometry = new CylinderGeometry(
		size.radius,
		size.radius,
		size.height - platformHeight,
		radialSegments
	);
	let material: Material = new MeshPhongMaterial({
		color: 0xf28c28,
		shininess,
	});
	const bodyMesh = new Mesh(geometry, material);
	bodyMesh.rotateX(Math.PI / 2);

	// create platform
	geometry = new CylinderGeometry(
		size.radius + 0.05,
		size.radius + 0.05,
		platformHeight - ringWidth,
		radialSegments
	);
	material = new MeshPhongMaterial({ color: 0x26afe3, shininess });
	let _mesh = new Mesh(geometry, material);
	bodyMesh.add(_mesh);
	_mesh.position.set(0, size.height / 2 - platformHeight / 2, 0);

	// create ring
	geometry = new TorusGeometry(
		size.radius - ringWidth + 0.05,
		ringWidth,
		3,
		radialSegments
	);
	material = new MeshPhongMaterial({ color: 0x26afe3, shininess });
	_mesh = new Mesh(geometry, material);
	bodyMesh.add(_mesh);
	_mesh.rotateX(Math.PI / 2);
	_mesh.position.set(0, size.height / 2, 0);

	// create pole
	geometry = new BoxGeometry(poleWidth, poleHeight, poleWidth);
	material = new MeshPhongMaterial({ color: 0x9eb1b8, shininess });
	const poleMesh = new Mesh(geometry, material);
	bodyMesh.add(poleMesh);
	poleMesh.name = poleName;
	poleMesh.position.set(
		size.radius + poleWidth / 2,
		poleHeight / 2 - size.height / 2,
		0
	);

	// create head
	const headWidth = size.radius * 2 * 0.7;
	const headHeight = 0.7;
	const headLen = size.radius * 2 * 0.9;
	const headColor = 0x4b7ece;

	const head = new Group();

	material = new MeshPhongMaterial({ color: headColor });

	// / base
	geometry = new BoxGeometry(poleWidth + 0.1, headHeight, poleWidth + 0.1);
	head.add(new Mesh(geometry, material));
	// / support
	geometry = new CylinderGeometry(0.3 * headHeight, 0.3 * headHeight, headLen);
	_mesh = new Mesh(geometry, material);
	_mesh.rotateZ(-Math.PI / 2);
	_mesh.translateY(-headLen / 2);

	head.add(_mesh);

	// / head
	geometry = new BoxGeometry(headWidth, headHeight, headLen);

	_mesh = new Mesh(geometry, material);
	_mesh.rotateY(-Math.PI / 2);
	_mesh.translateZ(headLen / 2 + (size.radius - headLen / 2));
	head.add(_mesh);

	poleMesh.add(head);
	head.name = headName;

	return bodyMesh;
}

export { createPrinter };
