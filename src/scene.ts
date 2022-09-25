import * as THREE from 'three';
import {
	AxesHelper,
	BufferGeometry,
	Mesh,
	MeshBasicMaterial,
	PointLight,
	Scene,
	SphereGeometry,
	Vector2,
	Vector3,
} from 'three';
import {
	createForklift,
	Forklift,
	ForkliftProperties,
	ForkliftSize,
	LiftSize,
} from './forklift';
import { createHangar, Hangar, HangarSize } from './hangar';
import { createPrinter, Printer, PrinterSize } from './printer';

const CONSTANTS = {
	forklift: {
		properties: {
			turnSensitivity: 0.05,
			speed: 0.4,
			size: {
				length: 6,
				width: 3,
				height: 3,
			},
			liftSensitivity: 0.05,
			liftSize: { height: 1, length: 2 },
		} as ForkliftProperties,
	} as const,
	camera: {
		distance: 20,
	} as const,
	hangar: {
		size: { width: 100, length: 100, height: 20 } as HangarSize,
	} as const,
	printer: {
		size: { width: 4, length: 4, height: 4 } as PrinterSize,
		position: new Vector2(10, 10),
	} as const,
};

// scene object that handles object creation
// add initialize method for this
function getSceneBuilder(mainCamera: THREE.PerspectiveCamera) {
	let forklift: Forklift;
	let hangar: Hangar;
	let scene: Scene;
	let printer: Printer;
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

		return {
			scene,
			forklift,
			hangar,
			printer,
		};
	}

	function setThirdPersonCamera() {
		scene.remove(mainCamera);
		forklift.mesh.add(mainCamera);
		mainCamera.position.x = -CONSTANTS.camera.distance;
		mainCamera.position.y = 0;
		mainCamera.position.z = CONSTANTS.camera.distance;
		const target = new Vector3();
		forklift.mesh.getWorldPosition(target);
		mainCamera.lookAt(target);
	}

	function setGlobalCamera() {
		forklift.mesh.remove(mainCamera);
		hangar.mesh.add(mainCamera);
		mainCamera.position.x = CONSTANTS.camera.distance;
		mainCamera.position.z = CONSTANTS.camera.distance;
		mainCamera.position.y = CONSTANTS.camera.distance;
		mainCamera.lookAt(0, 0, 0);
	}

	const cameraTypeNames = ['Global', 'ThirdPerson'] as const;
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
