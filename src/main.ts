import { getSceneBuilder } from './scene';
import * as THREE from 'three';
import { getUpdater, registerEvent } from './updater';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import keyController from './keyControlls';
import CollisionManager from './collisionManager';

window.addEventListener('resize', () => {
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
});

const camera = new THREE.PerspectiveCamera(
	65,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.screenSpacePanning = true;

const sceneBuilder = getSceneBuilder(camera);

const { scene, forklift, hangar, printer } = sceneBuilder.initialize();

type ControllerDef = {
	pressed: boolean;
	callback: Function;
};

function controllerOf(cb: Function): ControllerDef {
	return { pressed: false, callback: cb };
}

const controls = {
	a: controllerOf(forklift.turnLeft.bind(forklift)),
	d: controllerOf(forklift.turnRight.bind(forklift)),
	w: controllerOf(forklift.accelerate.bind(forklift)),
	s: controllerOf(forklift.decelerate.bind(forklift)),
	c: controllerOf(sceneBuilder.switchCamera.bind(sceneBuilder)),
	'1': controllerOf(() => {
		sceneBuilder.setGlobalCamera();
		orbitControls.enabled = true;
	}),
	'2': controllerOf(() => {
		orbitControls.enabled = false;
		sceneBuilder.setThirdPersonCamera();
	}),
	q: controllerOf(forklift.liftUp.bind(forklift)),
	e: controllerOf(forklift.liftDown.bind(forklift)),
	u: controllerOf(() => {
		printer.generateFigure('A2', 5, 1 * Math.PI);
	}),
	g: controllerOf(() => {
		forklift.takeFigure(printer);
	}),
};

Object.entries(controls).forEach(value =>
	keyController.addParallelKeyControl(value[0], value[1].callback)
);

const collisionManager = new CollisionManager(forklift, hangar, printer);

const updater = getUpdater();
registerEvent(() => {
	collisionManager.update();
	forklift.updatePosition();
	forklift.reset();
});

// Set camera
sceneBuilder.setGlobalCamera();

function animate() {
	requestAnimationFrame(animate);

	keyController.resolveKeys();

	updater.updateAll();

	renderer.render(scene, camera);
}

animate();
