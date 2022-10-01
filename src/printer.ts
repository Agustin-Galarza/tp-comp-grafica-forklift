import {
	BoxGeometry,
	Mesh,
	MeshStandardMaterial,
	Object3D,
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
		extrusionAngle: number = 0
	): void {
		if (this.figure) return;

		this.mesh.geometry.computeBoundingBox();
		let sizeVec = new Vector3();
		this.mesh.geometry.boundingBox!.getSize(sizeVec);

		this.figure = getFigure(type, sizeVec.x * 0.8, height, extrusionAngle);
		this.figure.name = 'figure';

		this.figure.position.set(0, this.height / 2, 0);

		this.mesh.add(this.figure);
	}
	giveFigure() {
		if (!this.figure) return undefined;
		this.mesh.remove(this.figure);

		const notMyFigureAnymore = this.figure.clone();
		this.figure = undefined;
		return notMyFigureAnymore;
	}
	getFigure() {
		return this.figure;
	}
}

function createPrinter(position: Vector2, size: PrinterSize) {
	const printer = new Printer(position, size);
	printer.mesh.position.set(position.x, position.y, size.height / 2);
	return printer;
}

function generatePrinterMesh(size: PrinterSize) {
	const geometry = new BoxGeometry(size.width, size.height, size.length);
	const material = new MeshStandardMaterial({ color: 0xf28c28 });
	const bodyMesh = new Mesh(geometry, material);
	bodyMesh.rotateX(Math.PI / 2);
	return bodyMesh;
}

export { createPrinter };
