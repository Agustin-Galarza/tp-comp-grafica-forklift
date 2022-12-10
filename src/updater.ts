import { Object3D, Scene, PerspectiveCamera, Vector3, Mesh } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BoxShape } from './collisionManager';
import { isKeyPressed, Key } from './keyControls';

export type UpdateData = {
	dt: number;
	entities: Entity[];
	scene: Scene;
	camera: PerspectiveCamera;
	orbitControls: OrbitControls;
};

type Updatable = {
	update(updateData: UpdateData): void;
	onPressedKeys: {
		[key in Key]?: EventType;
	};
};

export type Entity = (Object3D | BoxShape) & Updatable;

export type EventType =
	| ((data: UpdateData) => {})
	| ((data: UpdateData) => void);

type Updater = {
	updateAll: (dt: number) => void;
	registerEvent: (event: EventType) => void;
	registerEntity: (entity: Entity) => void;
};

type UpdaterProperties = {
	scene: Scene;
	camera: PerspectiveCamera;
	orbitControls: OrbitControls;
};

var updater: Updater | undefined = undefined;

export const cameraStatus = {
	pov: false,
	zoomNearThreshold: 4,
};

export type UpdateCameraProperties = {
	cameraPosition: Vector3;
	getTarget: () => Vector3;
	pov: boolean;
	updateData: UpdateData;
	mesh: Mesh;
};

export function updateCamera(properties: UpdateCameraProperties) {
	const { cameraPosition, getTarget, pov, updateData, mesh } = properties;
	const { camera, scene, orbitControls } = updateData;
	cameraStatus.pov = pov;
	if (pov) {
		orbitControls.enabled = false;
		mesh.add(camera);

		camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		camera.lookAt(getTarget());
	} else {
		camera.removeFromParent();
		scene.add(camera);

		camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
		const target = getTarget();
		camera.lookAt(target);
		orbitControls.enabled = true;
		orbitControls.center = target;
		orbitControls.target = target;
		orbitControls.update();
	}
}

export function cameraZoomIn(amount: number, updateData: UpdateData) {
	const { camera, orbitControls } = updateData;
	if (cameraStatus.pov) return;
	const distToTarget = orbitControls.target.distanceTo(camera.position);
	if (distToTarget > cameraStatus.zoomNearThreshold) {
		camera.translateZ(-amount * distToTarget);
		camera.updateProjectionMatrix();
	}
}

export function cameraZoomOut(amount: number, updateData: UpdateData) {
	const { camera, orbitControls } = updateData;
	if (cameraStatus.pov) return;

	const distToTarget = orbitControls.target.distanceTo(camera.position);
	camera.translateZ(amount * distToTarget);

	camera.updateProjectionMatrix();
}

export function initUpdater(properties: UpdaterProperties) {
	const events: EventType[] = [];
	const entities: Entity[] = [];
	const { scene, camera, orbitControls } = properties;

	function updateAll(dt: number) {
		const updateData: UpdateData = {
			dt,
			entities,
			scene,
			camera,
			orbitControls,
		};
		events.forEach(ev => ev(updateData));
		entities.forEach(entity => {
			Object.entries(entity.onPressedKeys).forEach(entry => {
				const key = entry[0] as Key;
				const action = entry[1];
				if (isKeyPressed[key]) {
					action(updateData);
				}
			});
			entity.update(updateData);
		});
	}
	function registerEvent(updater: EventType) {
		events.push(updater);
	}

	function registerEntity(entity: Entity) {
		entities.push(entity);
	}
	updater = {
		updateAll,
		registerEvent,
		registerEntity,
	};
	return updater;
}

export function getUpdater() {
	return updater;
}
