import {
	BoxGeometry,
	BufferGeometry,
	CircleGeometry,
	ColorRepresentation,
	CylinderGeometry,
	Material,
	Mesh,
	MeshPhongMaterial,
	MeshStandardMaterial,
	Object3D,
	TorusGeometry,
	Vector2,
	Vector3,
} from 'three';
import { BoxShape, Orientation } from './collisionManager';
import { FigureName, getFigure } from './figures';
import { Forklift } from './forklift';

export type PrinterSize = {
	width: number;
	length: number;
	height: number;
};

export class Printer extends BoxShape {
	readonly mesh: Mesh;
	private figure: Object3D | undefined = undefined;
	constructor(position: Vector2, size: PrinterSize) {
		super(position, new Orientation(), size.width, size.height, size.length);
		this.mesh = generatePrinterMesh(size);
	}
	generateFigure(
		type: FigureName,
		height: number,
		extrusionAngle: number = 0,
		{ color }: { color?: ColorRepresentation } = {}
	): void {
		if (this.figure) return;

		this.mesh.geometry.computeBoundingBox();
		let sizeVec = new Vector3();
		this.mesh.geometry.boundingBox!.getSize(sizeVec);

		this.figure = getFigure(
			type,
			sizeVec.x * 0.8,
			height,
			extrusionAngle,
			color
		);
		this.figure.name = 'figure';

		this.figure.position.set(0, this.height / 2, 0);

		this.mesh.add(this.figure);
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
	}
}

function createPrinter(position: Vector2, size: PrinterSize) {
	const printer = new Printer(position, size);
	printer.mesh.position.set(position.x, position.y, size.height / 2);
	return printer;
}

function generatePrinterMesh(size: PrinterSize) {
	const shininess = 20;
	const radialSegments = 8;
	const platformHeight = 0.5;
	const poleWidth = 0.4;
	const poleHeight = size.height + 15;
	//create body
	let geometry: BufferGeometry = new CylinderGeometry(
		size.width / 2,
		size.width / 2,
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
		size.width / 2 + 0.05,
		size.width / 2 + 0.05,
		platformHeight,
		radialSegments
	);
	material = new MeshPhongMaterial({ color: 0x26afe3, shininess });
	let _mesh = new Mesh(geometry, material);
	bodyMesh.add(_mesh);
	_mesh.position.set(0, size.height / 2 - platformHeight / 2, 0);

	// create ring
	const ringWidth = size.width / 20;
	geometry = new TorusGeometry(
		size.width / 2 - ringWidth + 0.05,
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
	_mesh = new Mesh(geometry, material);
	bodyMesh.add(_mesh);
	_mesh.position.set(
		size.width / 2 + poleWidth / 2,
		poleHeight / 2 - size.height / 2,
		0
	);

	return bodyMesh;
}

export { createPrinter };
