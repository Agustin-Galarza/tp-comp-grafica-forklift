import { getSceneBuilder, SceneProperties } from './scene';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import keyController from './keyControls';
import CollisionManager from './collisionManager';
import { GUI } from 'dat.gui';
import { FigureName } from './figures';
import { Color, ColorRepresentation, Vector3 } from 'three';
import { changePrinterLightsColor, PrintFigureData } from './printer';
import { initUpdater, UpdateData } from './updater';

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
		lightsColor: '#ffffff' as ColorRepresentation,
	},
	forklift: {
		followLift: false,
	},
};

export function getGuiStatus() {
	return guiController;
}

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
camera.name = 'camera';
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);
let orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enablePan = false;

const sceneBuilder = getSceneBuilder();

const { scene, forklift, hangar, printer, shelves } = sceneBuilder.initialize();

const collisionManager = new CollisionManager(
	forklift,
	hangar,
	printer,
	shelves
);

const updater = initUpdater({ scene, camera, orbitControls });
if (updater == undefined) {
	throw Error('Updater could not initialize');
}
updater.registerEvent(data => {
	collisionManager.update(data.dt);
});
updater.registerEntity(forklift);
updater.registerEntity(printer);
updater.registerEntity(shelves);
updater.registerEntity(hangar);

setUpGUI();

// Set camera
hangar.setGlobalCamera({ scene, camera, orbitControls } as UpdateData);
// forklift.setFirstPersonCamera({ scene, camera, orbitControls } as UpdateData);

let prevTime = 0;

function animate(time: DOMHighResTimeStamp) {
	const dt = time - prevTime;
	prevTime = time;
	requestAnimationFrame(animate);

	keyController.resolveKeys();

	if (updater == undefined) throw new Error('Updater is not defined');
	updater.updateAll(dt);

	renderer.render(scene, camera);
}

animate(prevTime);

function setUpGUI() {
	const gui = new GUI();

	const printingFolder = gui.addFolder('Impresión');
	printingFolder
		.add(guiController.printer, 'surfaceType', surfaceTypes)
		.onChange(() => {
			if (guiController.printer.surfaceType === 'revolution') {
				usedFigureNames = guiController.printer.revolutionFigureNames;
				guiController.printer.figure = 'A1';
			} else {
				usedFigureNames = guiController.printer.extrusionFigureNames;
				guiController.printer.figure = 'B1';
			}
			printingFolder.remove(figureController);
			figureController = printingFolder.add(
				guiController.printer,
				'figure',
				usedFigureNames
			);
			printingFolder.updateDisplay();
		})
		.name('Tipo de superficie');
	printingFolder
		.add(guiController.printer, 'torsionAngle', 0, 2 * Math.PI, 0.01)
		.name('Ángulo de Torsión');
	printingFolder
		.addColor(guiController.printer, 'figureColor')
		.name('Color de la fig.');
	printingFolder
		.add(
			guiController.printer,
			'figureHeight',
			0.5,
			SceneProperties.shelves.sectionSize.height,
			0.5
		)
		.name('Altura de la fig.');

	let figureController = printingFolder
		.add(guiController.printer, 'figure', usedFigureNames)
		.name('Tipo de figura');

	const printerFolder = gui.addFolder('Impresora');
	printerFolder
		.addColor(guiController.printer, 'lightsColor')
		.name('Color de las luces')
		.onChange(() => {
			changePrinterLightsColor(guiController.printer.lightsColor);
		});

	const forkliftFolder = gui.addFolder('Auto Elevador');
	forkliftFolder
		.add(guiController.forklift, 'followLift')
		.name('Seguir Elevador');
}
