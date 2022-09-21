import * as THREE from 'three';
import {
	AxesHelper,
	BufferGeometry,
	Mesh,
	MeshBasicMaterial,
	PointLight,
	Scene,
	SphereGeometry,
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
};

// scene object that handles object creation
// add initialize method for this
function getSceneBuilder(mainCamera: THREE.PerspectiveCamera) {
	let forkliftMesh: Mesh;
	let forklift: Forklift;
	let scene: Scene;
	let hangarMesh: Mesh;
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

		// create hangar mesh
		hangarMesh = generateHangarMesh(CONSTANTS.hangar.size);
		scene.add(hangarMesh);
		// create hangar
		const hangar = createHangar(CONSTANTS.hangar.size);

		// create forklift mesh
		const forkliftSize = CONSTANTS.forklift.properties.size;
		const liftSize = CONSTANTS.forklift.properties.liftSize;
		forkliftMesh = generateForkliftMesh(forkliftSize, liftSize);
		hangarMesh.add(forkliftMesh);
		// create forklift
		forklift = createForklift(forkliftMesh, CONSTANTS.forklift.properties);

		// default camera
		setThirdPersonCamera();

		return {
			scene,
			forklift,
		};
	}

	function setThirdPersonCamera() {
		scene.remove(mainCamera);
		forkliftMesh.add(mainCamera);
		mainCamera.position.x = -CONSTANTS.camera.distance;
		mainCamera.position.y = 0;
		mainCamera.position.z = CONSTANTS.camera.distance;
		const target = new Vector3();
		forkliftMesh.getWorldPosition(target);
		mainCamera.lookAt(target);
	}

	function setGlobalCamera() {
		forkliftMesh.remove(mainCamera);
		hangarMesh.add(mainCamera);
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

function generateForkliftMesh(forkliftSize: ForkliftSize, liftSize: LiftSize) {
	// const l = length / 2,
	// 	w = width / 2,
	// 	h = height / 2;
	// const reticule = [
	// 	new Vector3(-l / 2, -w, -h),
	// 	new Vector3(-l, -w, -h / 2),
	// 	new Vector3(-l, -w, h / 2),
	// 	new Vector3(-l / 2, -w, h),
	// 	new Vector3(l / 2, -w, h),
	// 	new Vector3(l, -w, h / 2),
	// 	new Vector3(l, -w, -h / 2),
	// 	new Vector3(l / 2, -w, -h),
	// 	new Vector3(-l / 2, w, -h),
	// 	new Vector3(-l, w, -h / 2),
	// 	new Vector3(-l, w, h / 2),
	// 	new Vector3(-l / 2, w, h),
	// 	new Vector3(l / 2, w, h),
	// 	new Vector3(l, w, h / 2),
	// 	new Vector3(l, w, -h / 2),
	// 	new Vector3(l / 2, w, -h),
	// 	new Vector3(-l / 2, -w, h / 2),
	// 	new Vector3(l / 2, -w, h / 2),
	// 	new Vector3(-l / 2, -w, -h / 2),
	// 	new Vector3(l / 2, -w, -h / 2),
	// 	new Vector3(-l / 2, w, h / 2),
	// 	new Vector3(l / 2, w, h / 2),
	// 	new Vector3(-l / 2, w, -h / 2),
	// 	new Vector3(l / 2, w, -h / 2),
	// ];
	// const normals: number[] = [];
	// const indices = [
	// 	0, 1, 8, 1, 9, 8, 1, 2, 9, 2, 10, 9, 2, 3, 10, 3, 11, 10, 3, 4, 11, 4, 12,
	// 	11, 4, 5, 12, 5, 13, 12, 5, 6, 13, 6, 14, 13, 6, 7, 14, 7, 15, 14, 7, 0, 15,
	// 	0, 8, 15, 2, 16, 3, 1, 18, 2, 18, 16, 2, 0, 18, 1, 0, 4, 3, 0, 7, 4, 7, 6,
	// 	19, 19, 6, 17, 6, 5, 17, 17, 5, 4, 11, 20, 10, 10, 20, 9, 20, 22, 9, 22, 8,
	// 	9, 11, 12, 8, 12, 15, 8, 12, 13, 21, 21, 13, 14, 21, 14, 23, 23, 14, 15,
	// ];
	// let array: number[] = [];
	// indices.forEach((i, index) => reticule[i].toArray(array, 3 * index));
	// const bodyVerteces = new Float32Array(array);

	// for (let i = 0; i < indices.length / 3; i++) {
	// 	let vecA: Vector3 = reticule[indices[i * 3]];
	// 	let vecB: Vector3 = reticule[indices[i * 3 + 1]];
	// 	let vecC: Vector3 = reticule[indices[i * 3 + 2]];
	// 	vecB.sub(vecA);
	// 	vecC.sub(vecA);

	// 	vecB.cross(vecC).normalize();
	// 	vecB.toArray(normals, i * 9);
	// 	vecB.toArray(normals, i * 9 + 3);
	// 	vecB.toArray(normals, i * 9 + 6);
	// }
	// const geometry = new THREE.BufferGeometry();
	// geometry.setAttribute('position', new THREE.BufferAttribute(bodyVerteces, 3));
	// geometry.setAttribute(
	// 	'normal',
	// 	new THREE.BufferAttribute(new Float32Array(normals), 3)
	// 	);

	//body
	let geometry: BufferGeometry = new THREE.BoxGeometry(
		forkliftSize.width,
		forkliftSize.height,
		forkliftSize.length
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	let material = new THREE.MeshStandardMaterial({ color: 0xfdda0d });
	const bodyMesh = new THREE.Mesh(geometry, material);

	//lift
	geometry = new THREE.BoxGeometry(
		forkliftSize.width,
		liftSize.height,
		liftSize.length
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	material = new THREE.MeshStandardMaterial({ color: 0xffbf00 });
	const liftMesh = new Mesh(geometry, material);
	liftMesh.name = 'lift';
	bodyMesh.add(liftMesh);
	liftMesh.translateX(forkliftSize.length / 2 + liftSize.length / 2);

	//wheels
	const wheelSize = {
		radius: forkliftSize.length / 6,
		width: 0.4,
	};
	for (let i = 0; i < 4; i++) {
		geometry = new THREE.CylinderGeometry(
			wheelSize.radius,
			wheelSize.radius,
			wheelSize.width,
			14,
			1,
			false
		);
		material = new THREE.MeshStandardMaterial({ color: 0x2f2a2d });
		const wheelMesh = new Mesh(geometry, material);
		wheelMesh.name = 'wheel' + i;
		bodyMesh.add(wheelMesh);

		wheelMesh.translateX(((i < 2 ? 1 : -1) * forkliftSize.length) / 3);
		wheelMesh.translateY(
			(i % 2 == 0 ? 1 : -1) * (forkliftSize.width / 2 + wheelSize.width / 2)
		);
		wheelMesh.translateZ(-forkliftSize.height / 2);
	}

	bodyMesh.translateZ(forkliftSize.height / 2 + wheelSize.radius);

	return bodyMesh;
}

function generateHangarMesh(size: HangarSize): Mesh {
	// create floor mesh
	let geo = new THREE.PlaneBufferGeometry(size.width, size.length, 100, 100);
	let mat = new THREE.MeshStandardMaterial({
		color: 0x8b5a2b,
	});
	let floorMesh = new Mesh(geo, mat);

	floorMesh.rotateX(-Math.PI / 2);

	floorMesh.add(new AxesHelper(5));

	//create walls
	for (let i = 0; i < 4; i++) {
		let width,
			height = size.height;
		if (i % 2 == 0) {
			width = size.width;
		} else {
			width = size.length;
		}
		geo = new THREE.PlaneBufferGeometry(width, height, 100, 100);
		mat = new THREE.MeshStandardMaterial({
			color: 0xa2b7db,
		});
		let wallMesh = new Mesh(geo, mat);
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
	// TODO: roof

	return floorMesh;
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
