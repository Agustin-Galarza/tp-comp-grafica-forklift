import * as THREE from 'three';
import {
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

const CONSTANTS = {
	forklift: {
		properties: {
			turnSensitivity: 0.04,
			speed: 0.5,
			size: {
				length: 15,
				width: 7,
				height: 4,
			},
			liftSensitivity: 0.15,
			liftSize: { height: 0.3, length: 4.5 },
			captureThreshold: 15,
		} as ForkliftProperties,
	},
	camera: {
		distance: 40,
	},
	hangar: {
		size: { width: 500, length: 500, height: 50 } as HangarSize,
	},
	printer: {
		size: { width: 6, length: 6, height: 6 } as PrinterSize,
		position: new Vector2(30, 0),
	},
	shelves: {
		sectionSize: { width: 8, height: 10, depth: 10 } as Size3,
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

		scene.add(new THREE.AmbientLight(0x707070));
		addRoomLight(
			scene,
			new Vector3(
				0,
				CONSTANTS.hangar.size.height / 2,
				CONSTANTS.hangar.size.length / 4
			)
		);
		addRoomLight(
			scene,
			new Vector3(
				0,
				CONSTANTS.hangar.size.height / 2,
				-CONSTANTS.hangar.size.length / 4
			)
		);
		// create hangar
		hangar = createHangar(CONSTANTS.hangar.size);
		scene.add(hangar.mesh);

		// create forklift
		forklift = createForklift(CONSTANTS.forklift.properties);
		hangar.mesh.add(forklift.mesh);

		//create printer
		printer = createPrinter(CONSTANTS.printer.position, CONSTANTS.printer.size);
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

		return {
			scene,
			forklift,
			hangar,
			printer,
			shelves,
		};
	}

	function setThirdPersonCamera() {
		scene.remove(mainCamera);
		printer.mesh.remove(mainCamera);
		shelves.mesh.remove(mainCamera);
		forklift.mesh.add(mainCamera);
		mainCamera.position.x = -CONSTANTS.camera.distance;
		mainCamera.position.y = 0;
		mainCamera.position.z = CONSTANTS.camera.distance;
		const target = new Vector3();
		forklift.mesh.getWorldPosition(target);
		mainCamera.lookAt(
			target.add(
				new Vector3(0, CONSTANTS.forklift.properties.size.height * 2, 0)
			)
		);
	}

	function setFirstPersonCamera() {
		scene.remove(mainCamera);
		printer.mesh.remove(mainCamera);
		shelves.mesh.remove(mainCamera);
		forklift.mesh.add(mainCamera);
		mainCamera.position.x = 0;
		mainCamera.position.y = 0;
		mainCamera.position.z = CONSTANTS.forklift.properties.size.height;
		const target = new Vector3();
		forklift.mesh.getWorldPosition(target);
		mainCamera.lookAt(
			target.add(
				new Vector3(
					10 * Math.cos(forklift.orientation.value),
					CONSTANTS.forklift.properties.size.height,
					-10 * Math.sin(forklift.orientation.value)
				)
			)
		);
	}

	function setLateralCamera() {
		scene.remove(mainCamera);
		printer.mesh.remove(mainCamera);
		shelves.mesh.remove(mainCamera);
		forklift.mesh.add(mainCamera);
		mainCamera.position.x = 0;
		mainCamera.position.y = CONSTANTS.camera.distance;
		mainCamera.position.z = 0;
		const target = new Vector3();
		forklift.mesh.getWorldPosition(target);
		mainCamera.lookAt(target);
	}

	function setGlobalCamera() {
		forklift.mesh.remove(mainCamera);
		mainCamera.position.x = CONSTANTS.camera.distance;
		mainCamera.position.z = CONSTANTS.camera.distance;
		mainCamera.position.y = CONSTANTS.camera.distance;
		mainCamera.lookAt(0, 0, 0);
	}

	function setPrinterCamera() {
		forklift.mesh.remove(mainCamera);
		mainCamera.position.x = CONSTANTS.camera.distance;
		mainCamera.position.z = CONSTANTS.camera.distance;
		mainCamera.position.y = CONSTANTS.camera.distance;
		const target = new Vector3();
		printer.mesh.getWorldPosition(target);
		mainCamera.lookAt(target);
	}

	function setShevlesCamera() {
		forklift.mesh.remove(mainCamera);

		mainCamera.position.x = CONSTANTS.camera.distance;
		mainCamera.position.z = CONSTANTS.camera.distance;
		mainCamera.position.y = CONSTANTS.camera.distance;
		const target = new Vector3();
		shelves.mesh.getWorldPosition(target);
		mainCamera.lookAt(target);
	}

	const cameraTypeNames = ['Global', 'ThirdPerson', 'FirstPerson'] as const;
	type CameraTypes = typeof cameraTypeNames[number];

	function* cameraTypeIterator() {
		while (true) {
			yield* cameraTypeNames;
		}
	}

	const cameraSwitcher: {
		[key in CameraTypes]: Function;
	} = {
		Global: () => {
			setGlobalCamera();
		},
		ThirdPerson: () => {
			setThirdPersonCamera();
		},
		FirstPerson: () => {
			setFirstPersonCamera();
		},
	};

	const cameraIterator: Generator<CameraTypes> = cameraTypeIterator();

	let switchCamera = () => {
		cameraSwitcher[cameraIterator.next().value as CameraTypes]();
	};

	return {
		initialize,
		setGlobalCamera,
		setThirdPersonCamera,
		switchCamera,
		setFirstPersonCamera,
		setPrinterCamera,
		setShevlesCamera,
		setLateralCamera,
	};
}

function addRoomLight(scene: Scene, position: Vector3) {
	const roomLigt = new PointLight(0xffffff, 0.3, 0, 2);
	const roomLigtMesh = new Mesh(
		new SphereGeometry(1),
		new MeshBasicMaterial({ color: 0xffffff })
	);
	roomLigt.position.set(...position.toArray());
	roomLigtMesh.position.set(...position.toArray());
	scene.add(roomLigt);
	scene.add(roomLigtMesh);
}

export { getSceneBuilder };
