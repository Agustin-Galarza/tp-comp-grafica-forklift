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
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);

const sceneBuilder = getSceneBuilder(camera);

const { scene, forklift, hangar, printer } = sceneBuilder.initialize();

const controls = {
	a: { pressed: false, callback: forklift.turnLeft.bind(forklift) },
	d: { pressed: false, callback: forklift.turnRight.bind(forklift) },
	w: { pressed: false, callback: forklift.accelerate.bind(forklift) },
	s: { pressed: false, callback: forklift.decelerate.bind(forklift) },
	c: { pressed: false, callback: sceneBuilder.switchCamera.bind(sceneBuilder) },
	'1': {
		pressed: false,
		callback: () => {
			sceneBuilder.setGlobalCamera();
			orbitControls.enabled = true;
		},
	},
	'2': {
		pressed: false,
		callback: () => {
			orbitControls.enabled = false;
			sceneBuilder.setThirdPersonCamera();
		},
	},
	u: { pressed: false, callback: forklift.liftUp.bind(forklift) },
	j: { pressed: false, callback: forklift.liftDown.bind(forklift) },
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
