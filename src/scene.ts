import * as THREE from 'three';
import {
	AxesHelper,
	BoxGeometry,
	MeshBasicMaterial,
	MeshPhongMaterial,
	Scene,
	Vector2,
	Vector3,
} from 'three';
import { Orientation } from './collisionManager';
import { createForklift, Forklift, ForkliftProperties } from './forklift';
import { createHangar, Hangar, HangarSize } from './hangar';
import { createPrinter, Printer, PrinterSize } from './printer';
import { createShelves, Shelves, Size3 } from './shelves';
import { generateSpotlight } from './spotlight';
import { loadTexture, TextureLoadParams } from './textureLoader';

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
function getSceneBuilder() {
	let forklift: Forklift;
	let hangar: Hangar;
	let scene: Scene;
	let printer: Printer;
	let shelves: Shelves;
	function initialize() {
		scene = new THREE.Scene();

		// create hangar
		hangar = createHangar(CONSTANTS.hangar.size);
		scene.add(hangar.mesh);

		scene.add(new THREE.AmbientLight(0x707070, 0.5));
		addLights(scene, (x, y) => hangar.getRoofHeightAt(new Vector2(x, y)));

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

function addLights(
	scene: Scene,
	getRoofHeight: (x: number, y: number) => number
) {
	const height = CONSTANTS.hangar.size.height * 1.3;
	const maxLen = CONSTANTS.hangar.size.length / 2;
	const maxWidth = CONSTANTS.hangar.size.width / 2;

	// add central lights
	const pos = new Vector3();
	pos.setY(height);
	const zValues = [maxLen / 3, -maxLen / 3];

	for (const zVal of zValues) {
		let x, y;
		x = 0;
		y = zVal;
		pos.setZ(y);
		pos.setX(x);
		addRoomLight(scene, pos, getRoofHeight(x, y));
		x = -maxWidth / 2;
		pos.setX(x);
		addRoomLight(scene, pos, getRoofHeight(x, y));
		x = maxWidth / 2;
		pos.setX(x);
		addRoomLight(scene, pos, getRoofHeight(x, y));
	}
}

function addRoomLight(scene: Scene, position: Vector3, roofHeight: number) {
	const sl = generateSpotlight(position, roofHeight);
	scene.add(sl.light);
	// const slh = new THREE.SpotLightHelper(sl.light);
	// scene.add(slh);
	scene.add(sl.mesh);
}

export { getSceneBuilder, CONSTANTS as SceneProperties };
