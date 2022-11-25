import * as THREE from 'three';
import {
	AxesHelper,
	Mesh,
	MeshBasicMaterial,
	PointLight,
	Scene,
	SphereGeometry,
	Vector2,
	Vector3,
} from 'three';
import { Orientation } from './collisionManager';
import { createForklift, Forklift, ForkliftProperties } from './forklift';
import { createHangar, Hangar, HangarSize } from './hangar';
import { createPrinter, Printer, PrinterSize } from './printer';
import { createShelves, Shelves, Size3 } from './shelves';
import { generateSpotlight } from './spotlight';

export const CONSTANTS = {
	forklift: {
		properties: {
			turnSensitivity: 0.004,
			speed: 0.04,
			size: {
				length: 15,
				width: 7,
				height: 4,
			},
			lift: {
				sensitivity: 0.015,
				size: { height: 0.3, length: 8 },
			},
			captureThreshold: 17,
		} as ForkliftProperties,
	},
	camera: {
		distance: 40,
	},
	hangar: {
		size: { width: 300, length: 300, height: 60 } as HangarSize,
	},
	printer: {
		size: { radius: 4, height: 7 } as PrinterSize,
		position: new Vector2(30, 0),
	},
	shelves: {
		sectionSize: { width: 8, height: 15, depth: 10 } as Size3,
		position: new Vector2(-40, 40),
		oritentation: new Orientation(-Math.PI / 2),
		baseHeight: 5,
		captureThreshold: 20,
	},
} as const;

// scene object that handles object creation
// add initialize method for this
function getSceneBuilder(mainCamera: THREE.PerspectiveCamera) {
	let forklift: Forklift;
	let hangar: Hangar;
	let scene: Scene;
	let printer: Printer;
	let shelves: Shelves;
	function initialize() {
		scene = new THREE.Scene();

		scene.add(new THREE.AmbientLight(0x707070, 0.5));
		addLights(scene);

		// create hangar
		hangar = createHangar(CONSTANTS.hangar.size);
		scene.add(hangar.mesh);

		// create forklift
		forklift = createForklift(CONSTANTS.forklift.properties);
		hangar.mesh.add(forklift.mesh);

		//create printer
		printer = createPrinter(
			CONSTANTS.printer.position,
			CONSTANTS.printer.size,
			CONSTANTS.shelves.sectionSize.height
		);
		hangar.mesh.add(printer.mesh);

		//create shelves
		shelves = createShelves(
			CONSTANTS.shelves.position,
			CONSTANTS.shelves.oritentation,
			CONSTANTS.shelves.sectionSize,
			{
				baseHeight: CONSTANTS.shelves.baseHeight,
				captureThreshold: CONSTANTS.shelves.captureThreshold,
			}
		);
		hangar.mesh.add(shelves.mesh);

		// scene.add(new AxesHelper(5));
		forklift.mesh.add(new AxesHelper(5));
		hangar.mesh.add(new AxesHelper(5));
		printer.mesh.add(new AxesHelper(5));
		shelves.mesh.add(new AxesHelper(5));
		return {
			scene,
			forklift,
			hangar,
			printer,
			shelves,
		};
	}
	return {
		initialize,
	};
}

function addLights(scene: Scene) {
	const height = CONSTANTS.hangar.size.height * 1.2;
	const maxLen = CONSTANTS.hangar.size.length / 2;
	const maxWidth = CONSTANTS.hangar.size.width / 2;
	// add central lights
	const pos = new Vector3();
	pos.setY(height);
	const zValues = [maxLen / 2, 0, -maxLen / 2];
	for (const zVal of zValues) {
		pos.setZ(zVal);
		pos.setX(0);
		addRoomLight(scene, pos);
		pos.setX(-maxWidth / 2);
		addRoomLight(scene, pos);
		pos.setX(maxWidth / 2);
		addRoomLight(scene, pos);
	}
}

function addRoomLight(scene: Scene, position: Vector3) {
	const sl = generateSpotlight(position);
	scene.add(sl.light);
	scene.add(sl.mesh);
}

export { getSceneBuilder, CONSTANTS as SceneProperties };
