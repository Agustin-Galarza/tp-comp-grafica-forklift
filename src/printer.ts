import { BoxGeometry, Mesh, MeshStandardMaterial, Vector2 } from 'three';
import { BoxShape, Orientation } from './collisionManager';

export type PrinterSize = {
	width: number;
	length: number;
	height: number;
};

export class Printer extends BoxShape {
	readonly mesh: Mesh;
	constructor(position: Vector2, size: PrinterSize) {
		super(position, new Orientation(), size.width, size.height, size.length);
		this.mesh = generatePrinterMesh(size);
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

	return bodyMesh;
}

export { createPrinter };
