import * as THREE from 'three';
import { loadTexture, TextureLoadParams } from './textureLoader';
import {
	AxesHelper,
	BufferAttribute,
	MeshNormalMaterial,
	Vector3,
} from 'three';
import {
	ColorRepresentation,
	Curve,
	Mesh,
	Object3D,
	Plane,
	Vector2,
} from 'three';
export interface FigureHolder {
	takeFigure(figure: Object3D): boolean;
	giveFigure(holder: FigureHolder): void;
}
export const figureNames = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
export type FigureName = typeof figureNames[number];

export type Pattern =
	| 'P1A'
	| 'P1B'
	| 'P1C'
	| 'P2A'
	| 'P2B'
	| 'P2C'
	| 'P3'
	| 'P4A'
	| 'P4B';

export const patterns: {
	[name in Pattern]: string;
} = {
	P1A: 'Pattern01 VarA.png',
	P1B: 'Pattern01 VarB.png',
	P1C: 'Pattern01 VarC.png',
	P2A: 'Pattern02 VarA.png',
	P2B: 'Pattern02 VarB.png',
	P2C: 'Pattern02 VarC.png',
	P3: 'Pattern03.png',
	P4A: 'Pattern04 VarA.png',
	P4B: 'Pattern04 VarB.png',
};

export function canTakeFigure(obj: Object): obj is FigureHolder {
	return 'takeFigure' in obj;
}

export function canGiveFigure(obj: Object): obj is FigureHolder {
	return 'giveFigure' in obj;
}

let currentPattern: Pattern = 'P1A';

export function getCurrentPattern() {
	return currentPattern;
}

export function setCurrentPattern(pattern: Pattern) {
	currentPattern = pattern;
}

type CurveType = 'bezier' | 'spline';

type SolidType = 'extrude' | 'lathe';

type CurveDef = {
	points: rawCoord[];
	type: CurveType;
};

type Figure = {
	curves: CurveDef[];
	solidType: SolidType;
	width: number;
	height: number;
};

type rawCoord = [number, number];

const widthScales: {
	[key in SolidType]: (figureWidth: number) => number;
} = {
	extrude: figureWidth => figureWidth,
	lathe: figureWidth => figureWidth / 2,
};
const heightScales: {
	[key in SolidType]: (figureHeight: number) => number;
} = {
	extrude: figureHeight => figureHeight / 2,
	lathe: figureHeight => figureHeight,
};

export function getFigure(
	type: FigureName,
	width: number,
	height: number,
	extrusionAngle: number = 0,
	color: ColorRepresentation = 0xa970ff,
	clippingPlane: Plane
): Object3D {
	const fig = figures[type];

	let figureObject;
	if (fig.solidType === 'extrude') {
		fig.width = width;
		fig.height = width;
		const points = getShapePoints(fig);
		figureObject = getSimpleExtrudeMesh(
			points,
			height,
			extrusionAngle,
			color,
			clippingPlane
		);
		figureObject.rotateX(-Math.PI / 2);
	} else {
		fig.width = width;
		fig.height = height;
		const points = getShapePoints(fig);
		figureObject = getSimpleLatheMesh(points, color, clippingPlane);
	}
	const repeatU = 1;
	const repeatV = 1;
	const texture = loadTexture({
		textureName: patterns[currentPattern],
		repeat: new Vector2(repeatU, repeatV),
	} as TextureLoadParams);
	figureObject.material.map = texture.map;

	// curstom uv mapping
	const positions = figureObject.geometry.attributes.position;
	const uvs = figureObject.geometry.attributes.uv;
	const normals = figureObject.geometry.attributes.normal;
	for (let i = 0; i < positions.count; i++) {
		const yNormal = normals.getY(i);
		const x = positions.getX(i);
		const y = positions.getY(i);
		const z = positions.getZ(i);

		let u = uvs.getX(i);
		let v = uvs.getY(i);

		if (yNormal == 1 || yNormal == -1) {
			u = ((x + width / 2) / width) * 2;
			v = ((z + width / 2) / width) * 2;
		} else {
			// get angle
			const angle = Math.atan2(z, x);
			u = angle / (2 * Math.PI);
			v = y / height;
		}

		uvs.setXY(i, u, v);
	}
	figureObject.add(new AxesHelper(3));
	// figureObject.material = new MeshNormalMaterial({ wireframe: false });
	return figureObject;
}

function getSimpleLatheMesh(
	points: Vector2[],
	color: ColorRepresentation,
	clippingPlane: Plane
): Mesh<THREE.LatheBufferGeometry, THREE.MeshPhongMaterial> {
	const geometry = new THREE.LatheBufferGeometry(points, 50);
	const material = new THREE.MeshPhongMaterial({
		color,
		shininess: 32,
		side: THREE.DoubleSide,
		clippingPlanes: [clippingPlane],
	});
	const mesh = new THREE.Mesh(geometry, material);
	return mesh;
}

function twistMesh(mesh: Mesh, angle: number, height: number): Mesh {
	if (angle <= 0) return mesh;
	/**
	 * Otra idea totalmente distinta, suavizar las normales:
	 * Para esto primero tengo que rotar todos los puntos hasta la figura que quiero y recalcular las normales, y una vez hecho esto tengo que iterar por todos los vértices de la figura.
	 * El problema es que threejs separa los vértices según el triángulo al que pertenecen, por lo que un vértice (como una posición) que aparece en dos triángulos se repite dos veces en la data de la figura
	 * Para sobrepasar esto tengo que generar mi propio mapa de vértices, donde la posición sea la key y el valor sea la normal resultante. De esta forma, voy recorriendo todos los vértices y los agrego al mapa, sumando el valor de su normal al resultado. Una vez que termino con esto, vuelvo a recorrer todos los vértices y le reasigno la nueva normal normalizada.
	 */
	function fromAttribute(
		attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
		index: number
	): Vector3 {
		return new Vector3(
			attribute.getX(index),
			attribute.getY(index),
			attribute.getZ(index)
		);
	}

	const EPSILON = 1e-8;

	const positions = mesh.geometry.attributes.position;
	const normals = mesh.geometry.attributes.normal;

	// Rotate points
	for (let i = 0; i < positions.count; i++) {
		const position: Vector3 = fromAttribute(positions, i);
		// position.setZ(position.z + height / 2);

		const deltaRotation = angle / height;
		const currentRotation = deltaRotation * position.z;

		const newX =
			position.x * Math.cos(currentRotation) -
			position.y * Math.sin(currentRotation);
		const newY =
			position.y * Math.cos(currentRotation) +
			position.x * Math.sin(currentRotation);

		position.setX(newX);
		position.setY(newY);

		positions.setXYZ(i, position.x, position.y, position.z);
	}
	// console.log(normals);
	mesh.geometry.attributes.position.needsUpdate = true;
	// mesh.geometry.attributes.normal.needsUpdate = true;
	mesh.geometry.computeBoundingBox();
	mesh.geometry.computeBoundingSphere();
	// Let threejs re-compute all the normals
	mesh.geometry.computeVertexNormals();

	/**
	 * Para poder preservar los ejes filosos, tengo que cambiar el mapa por uno que tenga un array de normales en sus valores.
	 * La idea es que por cada posición puede haber varias normales, cada una representando la normal de cada una de las caras que comparten el borde afilado.
	 * De esta forma, al agregar valores al mapa, tengo que acumular cada normal con la que sea más cercana.
	 * Para definir cercanía tengo que establecer algún criterio: de momento va a ser que las normales tienen que tener un ángluo entre ellas menor a PI/4 para que sean consideradas cercanas.
	 */
	const vertexMap = new Map<Vector3, Array<Vector3>>(); // key: vertex position || value: vertex normal

	function vectorEquals(v1: Vector3, v2: Vector3): boolean {
		const equalsFloats = (n1: number, n2: number, epsilon: number) =>
			Math.abs(n1 - n2) < epsilon;
		return (
			equalsFloats(v1.x, v2.x, EPSILON) &&
			equalsFloats(v1.y, v2.y, EPSILON) &&
			equalsFloats(v1.z, v2.z, EPSILON)
		);
	}
	function hasPosition(
		map: Map<Vector3, Array<Vector3>>,
		position: Vector3
	): boolean {
		for (let keyPosition of map.keys()) {
			if (vectorEquals(keyPosition, position)) return true;
		}
		return false;
	}
	function getPositionValue(
		map: Map<Vector3, Array<Vector3>>,
		position: Vector3
	): Array<Vector3> {
		for (let entry of map.entries()) {
			if (vectorEquals(entry[0], position)) return entry[1];
		}
		throw new Error(
			`Could not find value (${position.x},${position.y},${position.z}) in map`
		);
	}
	function areNormalsClose(normal1: Vector3, normal2: Vector3): boolean {
		return normal1.angleTo(normal2) < Math.PI / 4;
	}
	function mergeNormal(
		map: Map<Vector3, Array<Vector3>>,
		position: Vector3,
		normal: Vector3
	): void {
		const normalsArray = getPositionValue(map, position);
		let foundCloseNormal = false;
		for (let n = 0; n < normalsArray.length && !foundCloseNormal; n++) {
			const accumulatedNormal = normalsArray[n];
			if (areNormalsClose(accumulatedNormal, normal)) {
				accumulatedNormal.add(normal);
				foundCloseNormal = true;
			}
		}
		if (!foundCloseNormal) normalsArray.push(normal);
	}

	for (let i = 0; i < positions.count; i++) {
		const position = fromAttribute(positions, i);
		const normal = fromAttribute(normals, i);
		// merge position
		if (hasPosition(vertexMap, position)) {
			mergeNormal(vertexMap, position, normal);
		} else {
			vertexMap.set(position, [normal]);
		}
	}

	for (let i = 0; i < positions.count; i++) {
		const normalsArray = getPositionValue(
			vertexMap,
			fromAttribute(positions, i)
		);
		let foundCloseNormal = false;
		for (let n = 0; n < normalsArray.length && !foundCloseNormal; n++) {
			const accumulatedNormal = normalsArray[n];
			if (areNormalsClose(accumulatedNormal, fromAttribute(normals, i))) {
				accumulatedNormal.normalize();
				normals.setXYZ(
					i,
					accumulatedNormal.x,
					accumulatedNormal.y,
					accumulatedNormal.z
				);
				foundCloseNormal = true;
			}
		}
		if (!foundCloseNormal) throw new Error('Could not find appropiate normal');
	}

	return mesh;
}

function getSimpleExtrudeMesh(
	points: Vector2[],
	height: number,
	angle: number,
	color: ColorRepresentation,
	clippingPlane: Plane
): Mesh<THREE.ExtrudeBufferGeometry, THREE.MeshPhongMaterial> {
	const shape = new THREE.Shape(points);

	const extrudeSettings = {
		steps: 50,
		depth: height,
		bevelEnabled: false,
	};

	const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings);
	geometry.center();
	const material = new THREE.MeshPhongMaterial({
		color,
		shininess: 32,
		clippingPlanes: [clippingPlane],
	});
	// const material = new THREE.MeshNormalMaterial();
	const mesh = new THREE.Mesh(geometry, material);
	twistMesh(mesh, angle, height);
	geometry.rotateX(-Math.PI / 2);
	mesh.rotateX(Math.PI / 2);
	mesh.geometry.center();
	mesh.geometry.translate(0, height / 2, 0);
	return mesh;
}

const curveInitializers: {
	[key in CurveType]: (basePoints: Vector2[]) => Curve<Vector2>;
} = {
	spline: (basePoints: Vector2[]) => new THREE.SplineCurve(basePoints),
	bezier: (basePoints: Vector2[]) =>
		new THREE.CubicBezierCurve(
			basePoints[0],
			basePoints[1],
			basePoints[2],
			basePoints[3]
		),
};

function getSegmentPoints(
	{ points, type }: CurveDef,
	height: number,
	width: number
): Vector2[] {
	const hWidth = width / 2;
	const basePoints = points.map(
		p => new THREE.Vector2(hWidth * p[0], height * p[1])
	);
	const curve = curveInitializers[type](basePoints);

	const pointsCB = curve.getPoints(5);
	return pointsCB;
}
function getShapePoints(figure: Figure): Vector2[] {
	const shapePoints: Vector2[] = [];
	figure.curves.forEach(segment =>
		getSegmentPoints(
			segment,
			heightScales[figure.solidType](figure.height),
			widthScales[figure.solidType](figure.width)
		).forEach(point => shapePoints.push(point))
	);
	return shapePoints;
}

const figures: { [key in FigureName]: Figure } = {
	A1: {
		curves: [
			{
				points: [
					[0, 0],
					[1, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0],
					[1, 0.19],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.19],
					[0.25, 0.26],
					[0.65, 0.36],
					[0.78, 0.49],
					[0.65, 0.64],
					[0.25, 0.74],
					[1, 0.81],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.81],
					[1, 1],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 1],
					[0, 1],
				],
				type: 'spline',
			},
		],
		width: 30,
		height: 50,
		solidType: 'lathe',
	},
	A2: {
		curves: [
			{
				points: [
					[0, 0],
					[1.7, 0.05],
					[0.3, 0.4],
					[0.4, 0.55],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.4, 0.55],
					[0.6, 0.75],
					[0.8, 0.8],
					[0.8, 0.84],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.8, 0.84],
					[0.8, 0.86],
					[0.35, 0.88],
					[0.4, 0.95],
				],
				type: 'bezier',
			},
		],
		height: 50,
		width: 30,
		solidType: 'lathe',
	},
	A3: {
		curves: [
			{
				points: [
					[0, 0],
					[1, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0],
					[0.25, 0.15],
				],
				type: 'spline',
			},
			{
				points: [
					[0.25, 0.15],
					[0.25, 0.25],
				],
				type: 'spline',
			},
			{
				points: [
					[0.25, 0.25],
					[0.75, 0.37],
					[0.75, 0.37],
					[0.75, 0.6],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.75, 0.6],
					[0.8, 1.07],
					[0.3, 0.8],
					[0.3, 1],
				],
				type: 'bezier',
			},
		],
		height: 40,
		width: 40,
		solidType: 'lathe',
	},
	A4: {
		curves: [
			{
				points: [
					[0, 0],
					[0.6, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[0.6, 0],
					[0.7, 0.02],
					[0.8, 0.07],
					[0.78, 0.155],
					[0.55, 0.2],
				],
				type: 'spline',
			},
			{
				points: [
					[0.55, 0.2],
					[0.15, 0.25],
					[0.3, 0.47],
					[1, 0.5],
				],
				type: 'bezier',
			},
			{
				points: [
					[1, 0.5],
					[2, 0.53],
					[0.4, 0.47],
					[0.4, 0.8],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.4, 0.8],
					[0.4, 0.9],
					[0.4, 0.98],
					[0, 1],
				],
				type: 'bezier',
			},
		],
		height: 50,
		width: 40,
		solidType: 'lathe',
	},
	B1: {
		curves: [
			{
				points: [
					[0, 0],
					[1, 0.5],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.5],
					[0, 1],
				],
				type: 'spline',
			},
			{
				points: [
					[0, 1],
					[0, 0],
				],
				type: 'spline',
			},
		],
		height: 50,
		width: 50,
		solidType: 'extrude',
	},
	B2: {
		curves: [
			{
				points: [
					[0, 0.5],
					[0.23, 0.38],
					[0.15, 0.1],
				],
				type: 'spline',
			},
			{
				points: [
					[0.15, 0.1],
					[0.4, 0.2],
					[0.6, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[0.6, 0],
					[0.7, 0.23],
					[1, 0.25],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.25],
					[0.83, 0.5],
					[1, 0.75],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.75],
					[0.71, 0.76],
					[0.62, 1],
				],
				type: 'spline',
			},
			{
				points: [
					[0.62, 1],
					[0.45, 0.8],
					[0.15, 0.9],
				],
				type: 'spline',
			},
			{
				points: [
					[0.15, 0.9],
					[0.23, 0.65],
					[0, 0.5],
				],
				type: 'spline',
			},
		],
		height: 50,
		width: 50,
		solidType: 'extrude',
	},
	B3: {
		curves: [
			{
				points: [
					[0, 0.66],
					[0.25, 0.66],
				],
				type: 'spline',
			},
			{
				points: [
					[0.25, 0.66],
					[0.25, 0.33],
				],
				type: 'spline',
			},
			{
				points: [
					[0.25, 0.33],
					[0, 0.33],
				],
				type: 'spline',
			},
			{
				points: [
					[0, 0.33],
					[0.015, 0.14],
					[0.14, 0.015],
					[0.33, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[0.33, 0],
					[0.33, 0.25],
				],
				type: 'spline',
			},
			{
				points: [
					[0.33, 0.25],
					[0.66, 0.25],
				],
				type: 'spline',
			},
			{
				points: [
					[0.66, 0.25],
					[0.66, 0],
				],
				type: 'spline',
			},
			{
				points: [
					[0.66, 0],
					[0.86, 0.015],
					[0.985, 0.14],
					[1, 0.33],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.33],
					[0.75, 0.33],
				],
				type: 'spline',
			},
			{
				points: [
					[0.75, 0.33],
					[0.75, 0.66],
				],
				type: 'spline',
			},
			{
				points: [
					[0.75, 0.66],
					[1, 0.66],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.66],
					[0.985, 0.86],
					[0.86, 0.985],
					[0.66, 1],
				],
				type: 'spline',
			},
			{
				points: [
					[0.66, 1],
					[0.66, 0.75],
				],
				type: 'spline',
			},
			{
				points: [
					[0.66, 0.75],
					[0.33, 0.75],
				],
				type: 'spline',
			},
			{
				points: [
					[0.33, 0.75],
					[0.33, 1],
				],
				type: 'spline',
			},
			{
				points: [
					[0.33, 1],
					[0.14, 0.985],
					[0.015, 0.86],
					[0, 0.66],
				],
				type: 'spline',
			},
		],
		height: 50,
		width: 50,
		solidType: 'extrude',
	},
	B4: {
		curves: [
			{
				points: [
					[0.25, 0.25],
					[0.25, -0.082],
					[0.75, -0.082],
					[0.75, 0.25],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.75, 0.25],
					[0.75, 0.75],
				],
				type: 'spline',
			},
			{
				points: [
					[0.75, 0.75],
					[0.75, 1.082],
					[0.25, 1.082],
					[0.25, 0.75],
				],
				type: 'bezier',
			},
			{
				points: [
					[0.25, 0.75],
					[0.25, 0.25],
				],
				type: 'spline',
			},
		],
		height: 50,
		width: 50,
		solidType: 'extrude',
	},
};
