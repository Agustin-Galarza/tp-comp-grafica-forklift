import { getSceneBuilder } from './scene';
import * as THREE from 'three';
import { getUpdater, registerEvent } from './updater';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

const { scene, forklift } = sceneBuilder.initialize();

const resolveKeyboardActions = setUpControllers();

const updater = getUpdater();
registerEvent(() => {
	forklift.updatePosition();
	forklift.reset();
});

// Set camera
sceneBuilder.setGlobalCamera();

function animate() {
	requestAnimationFrame(animate);

	resolveKeyboardActions();

	updater.updateAll();

	renderer.render(scene, camera);
}

animate();

function setUpControllers() {
	type EventKeys = 'a' | 'd' | 'w' | 's' | 'c' | '1' | '2' | 'u' | 'j';

	type Controller = {
		[key in EventKeys]: { pressed: boolean; callback: Function };
	};
	const controller: Controller = {
		a: { pressed: false, callback: forklift.turnLeft },
		d: { pressed: false, callback: forklift.turnRight },
		w: { pressed: false, callback: forklift.accelerate },
		s: { pressed: false, callback: forklift.decelerate },
		c: { pressed: false, callback: sceneBuilder.switchCamera },
		1: {
			pressed: false,
			callback: () => {
				sceneBuilder.setGlobalCamera();
				orbitControls.enabled = true;
			},
		},
		2: {
			pressed: false,
			callback: () => {
				orbitControls.enabled = false;
				sceneBuilder.setThirdPersonCamera();
			},
		},
		u: { pressed: false, callback: forklift.liftUp },
		j: { pressed: false, callback: forklift.liftDown },
	};

	function isEventKey(str: string): str is EventKeys {
		return str in controller;
	}

	document.addEventListener('keydown', function (event) {
		if (isEventKey(event.key)) {
			controller[event.key].pressed = true;
		}
	});
	document.addEventListener('keyup', function (event) {
		if (isEventKey(event.key)) {
			controller[event.key].pressed = false;
		}
	});

	return () => {
		Object.keys(controller).forEach(key => {
			if (isEventKey(key) && controller[key].pressed)
				controller[key].callback();
		});
	};
}
