import * as THREE from 'three';
import {
	BufferGeometry,
	CylinderGeometry,
	Material,
	Mesh,
	BackSide,
	Shape,
	ShapeBufferGeometry,
	ArcCurve,
	SphereGeometry,
	MeshBasicMaterial,
	AxesHelper,
} from 'three';
import { Room } from './collisionManager';
import { Vector2, Vector3 } from 'three';
import {
	EventType,
	UpdateData,
	cameraZoomIn,
	cameraZoomOut,
	updateCamera,
} from './updater';
import { Key } from './keyControls';

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
	get position(): THREE.Vector2 {
		return new Vector2();
	}
	// @ts-ignore
	set position(newPos: THREE.Vector2) {}

	onPressedKeys: {
		[key in Key]?: EventType;
	} = {
		1: this.setGlobalCamera.bind(this),
		o: this.zoomIn.bind(this),
		p: this.zoomOut.bind(this),
	};

	private cameraProperties = {
		globalDistance: 40,
	};

	setGlobalCamera(updateData: UpdateData) {
		updateCamera({
			cameraPosition: new Vector3().setScalar(
				this.cameraProperties.globalDistance
			),
			getTarget: () => new Vector3(0, 0, 0),
			pov: false,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	zoomIn(updateData: UpdateData) {
		cameraZoomIn(0.02, updateData);
	}

	zoomOut(updateData: UpdateData) {
		cameraZoomOut(0.02, updateData);
	}

	update(updateData: UpdateData) {}

	getRoofHeightAt(position: Vector2): number {
		const { roofRadius, roofHalfTheta, roofPosition } = generateRoofProperties(
			this.height,
			this.width
		);
		const radius = roofRadius;
		const angle = (position.x / (this.width / 2)) * roofHalfTheta;
		return radius * Math.cos(angle) + roofPosition.z;
	}
}

function createHangar(size: HangarSize) {
	hangar = new Hangar(size);
	return hangar;
}

function getHangar() {
	return hangar;
}

function generateRoofProperties(
	height: number,
	width: number
): {
	roofHeight: number;
	roofRadius: number;
	roofHalfTheta: number;
	roofPosition: Vector3;
} {
	const roofHeight = height / 2;
	const roofRadius = width ** 2 / (8 * roofHeight) + roofHeight / 2;
	const roofHalfTheta = Math.atan(width / 2 / (roofRadius - roofHeight));
	const roofPosition = new Vector3(0, 0, -(roofRadius - height - roofHeight));
	return {
		roofHeight,
		roofRadius,
		roofHalfTheta,
		roofPosition,
	};
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
	const { roofHeight, roofRadius, roofHalfTheta, roofPosition } =
		generateRoofProperties(size.height, size.width);
	geo = new CylinderGeometry(
		roofRadius,
		roofRadius,
		size.length,
		100,
		10,
		true,
		-roofHalfTheta,
		roofHalfTheta * 2
	);
	mat = new THREE.MeshStandardMaterial({
		color: 0xc1dbe5,
	});
	mat.side = BackSide;
	let roofMesh = new Mesh(geo, mat);

	floorMesh.add(roofMesh);
	roofMesh.position.set(roofPosition.x, roofPosition.y, roofPosition.z);

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
				createWallTopGeometry(
					roofRadius,
					Math.PI / 2 - roofHalfTheta,
					Math.PI / 2 + roofHalfTheta
				),
				mat
			);

			topWallMesh.translateY(((i < 2 ? 1 : -1) * (roofHeight + height)) / 2);
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

function createWallTopGeometry(
	radius: number,
	startAngle: number,
	endAngle: number
): BufferGeometry {
	const curve = new ArcCurve(-radius, 0, radius, startAngle, endAngle, false);
	const shape = new Shape().setFromPoints(curve.getPoints(30));
	const geometry = new ShapeBufferGeometry(shape);
	geometry.center();
	return geometry;
}

export { createHangar, getHangar };
