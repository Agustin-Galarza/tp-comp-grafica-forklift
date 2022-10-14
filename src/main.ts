import { getSceneBuilder, SceneProperties } from './scene';
import * as THREE from 'three';
import updater from './updater';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import keyController from './keyControls';
import CollisionManager from './collisionManager';
import { GUI } from 'dat.gui';
import { FigureName } from './figures';
import { ColorRepresentation, Vector3 } from 'three';
import { PrintFigureData } from './printer';

type ControllerDef = {
	pressed: boolean;
	callback: Function;
};

const surfaceTypes = ['extrusion', 'revolution'] as const;
type SurfaceType = typeof surfaceTypes[number];

const guiController = {
	printer: {
		surfaceType: 'revolution' as SurfaceType,
		revolutionFigureNames: ['A1', 'A2', 'A3', 'A4'] as FigureName[],
		extrusionFigureNames: ['B1', 'B2', 'B3', 'B4'] as FigureName[],
		figure: 'A1' as FigureName,
		torsionAngle: 0 as number,
		figureHeight: 10 as number,
		figureColor: '#a970ff' as ColorRepresentation,
	},
};
export function getPrintFigureData(): PrintFigureData {
	return {
		type: guiController.printer.figure,
		height: guiController.printer.figureHeight,
		extrusionAngle: guiController.printer.torsionAngle,
		color: guiController.printer.figureColor,
	};
}
let usedFigureNames: FigureName[] = guiController.printer.revolutionFigureNames;

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
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);
let orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enablePan = false;

const sceneBuilder = getSceneBuilder(camera);

const { scene, forklift, hangar, printer, shelves } = sceneBuilder.initialize();

const collisionManager = new CollisionManager(
	forklift,
	hangar,
	printer,
	shelves
);

updater.registerEvent(data => {
	collisionManager.update(data.dt);
});
updater.registerEntity(forklift);
updater.registerEntity(printer);
updater.registerEntity(shelves);

setUpGUI();

// Set camera
sceneBuilder.setGlobalCamera();

setUpKeyControls();

let prevTime = 0;

function animate(time: DOMHighResTimeStamp) {
	const dt = time - prevTime;
	prevTime = time;
	requestAnimationFrame(animate);

	keyController.resolveKeys();

	updater.updateAll(dt);

	renderer.render(scene, camera);
}

animate(prevTime);

function setUpKeyControls() {
	function controllerOf(cb: Function): ControllerDef {
		return { pressed: false, callback: cb };
	}
	const cameraTypes = ['orbital', 'pov'] as const;
	type CameraTypes = typeof cameraTypes[number];
	let camType: CameraTypes = 'orbital';

	const controls = {
		c: controllerOf(sceneBuilder.switchCamera.bind(sceneBuilder)),
		'1': controllerOf(() => {
			sceneBuilder.setGlobalCamera();
			camType = 'orbital';
			orbitControls.enabled = true;
			orbitControls.target.set(0, 0, 0);
		}),
		'2': controllerOf(() => {
			sceneBuilder.setPrinterCamera();
			orbitControls.enabled = true;
			camType = 'orbital';
			const target = new Vector3();
			printer.mesh.getWorldPosition(target);
			orbitControls.target.set(target.x, target.y + printer.height, target.z);
		}),
		'3': controllerOf(() => {
			sceneBuilder.setShevlesCamera();
			orbitControls.enabled = true;
			camType = 'orbital';
			const target = shelves.getWorldPosition();
			orbitControls.target.set(target.x, target.y, target.z);
		}),
		'4': controllerOf(() => {
			orbitControls.enabled = false;
			camType = 'pov';
			sceneBuilder.setFirstPersonCamera();
		}),
		'5': controllerOf(() => {
			orbitControls.enabled = false;
			camType = 'pov';
			sceneBuilder.setThirdPersonCamera();
		}),
		'6': controllerOf(() => {
			sceneBuilder.setLateralCamera();
			orbitControls.enabled = false;
			camType = 'pov';
		}),
		o: controllerOf(() => {
			if (camType === 'pov') return;
			const distToTarget = orbitControls.target.distanceTo(camera.position);
			if (distToTarget > 4) {
				camera.translateZ(-0.02 * distToTarget);
				camera.updateProjectionMatrix();
			}
		}),
		p: controllerOf(() => {
			if (camType === 'pov') return;

			const distToTarget = orbitControls.target.distanceTo(camera.position);
			camera.translateZ(0.02 * distToTarget);

			camera.updateProjectionMatrix();
		}),
	};

	Object.entries(controls).forEach(value =>
		keyController.addParallelKeyControl(value[0], value[1].callback)
	);
}

function setUpGUI() {
	const gui = new GUI();

	const printerFolder = gui.addFolder('Printer');
	printerFolder
		.add(guiController.printer, 'surfaceType', surfaceTypes)
		.onChange(() => {
			if (guiController.printer.surfaceType === 'revolution') {
				usedFigureNames = guiController.printer.revolutionFigureNames;
				guiController.printer.figure = 'A1';
			} else {
				usedFigureNames = guiController.printer.extrusionFigureNames;
				guiController.printer.figure = 'B1';
			}
			printerFolder.remove(figureController);
			figureController = printerFolder.add(
				guiController.printer,
				'figure',
				usedFigureNames
			);
			printerFolder.updateDisplay();
		});
	printerFolder.add(
		guiController.printer,
		'torsionAngle',
		0,
		2 * Math.PI,
		0.01
	);
	printerFolder.addColor(guiController.printer, 'figureColor');
	printerFolder.add(
		guiController.printer,
		'figureHeight',
		0.5,
		SceneProperties.shelves.sectionSize.height,
		0.5
	);

	let figureController = printerFolder.add(
		guiController.printer,
		'figure',
		usedFigureNames
	);
}
