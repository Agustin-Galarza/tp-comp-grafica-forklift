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
	 * Tengo un eje de rotación, un vector de posición y el vector normal actual
	 * Para el vector normal pueden ocurrir varias cosas:
	 * - Si el vector es paralelo al vector de rotación, el vector normal no se ve afectado por la rotación
	 * - Si el vector es paralelo al vector de posición, el vector normal se rota por el ángulo de rotación
	 * - Para los otros casos hay que ver la relación entre el vector normal y el de posición. Se tiene que calcular el ángulo de desfazaje entre el vector normal y el de posición, siendo este ángulo menor a 180°. Si el ángulo es positivo (en el sentido de la rotación) entonces el vector normal se rota hacia abajo (en contra del vector de rotación) una cantidad igual al delta del ángulo de rotación. Si el ángulo es negativo, entonces dicha variación es hacia arriba. En todos los casos al vector normal también se lo rota por el ángulo de rotación.
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
	const rotation = new Vector3(0, 0, 1);

	function getOrthogonalVector(normal: Vector3): Vector3 {
		let x;
		let y;
		if (Math.abs(normal.x) < EPSILON) {
			x = 1;
			y = 0;
		} else if (Math.abs(normal.y) < EPSILON) {
			x = 0;
			y = 1;
		} else {
			x = 1;
			y = -normal.x / normal.y;
		}
		const z = 0;
		const vec = new Vector3(x, y, z);
		if (Math.abs(vec.dot(normal)) > EPSILON)
			throw new Error(
				'Computed vector is not orthogonal, dot product is ' + vec.dot(normal)
			);
		return vec.normalize();
	}
	console.log(mesh.geometry.attributes);

	const positions = mesh.geometry.attributes.position;
	const normals = mesh.geometry.attributes.normal;
	for (let i = 0; i < positions.count; i++) {
		const position: Vector3 = fromAttribute(positions, i);
		// position.setZ(position.z + height / 2);
		const normal: Vector3 = fromAttribute(normals, i);

		if (normal.equals(new Vector3())) continue;

		const deltaRotation = angle / height;
		const currentRotation = deltaRotation * position.z;

		if (
			/* Normal is parallel to rotation */
			Math.abs(normal.dot(rotation)) >
			1 - EPSILON //Both vectors are normalized so the dot product should be 1 if parallel
		) {
			// Nothing happens
		} else if (
			/* Normal parallel to position */
			Math.abs(normal.dot(position)) >
			position.length() - EPSILON
		) {
			normal.applyAxisAngle(rotation, currentRotation);
		} else {
			const planeNormal = normal.clone().setZ(0);
			// normal.applyAxisAngle(rotation, currentRotation);

			// El ángulo es positivo (respecto a la rotación) si el producto cruz entre el vector de posición y el vector normal es parallelo al vector de rotación
			const planePosition = position.clone().setZ(0);

			const crossProduct = planePosition.clone().cross(planeNormal);

			const shiftSign = crossProduct.z > EPSILON ? 1 : -1;
			const verticalRotationAngle =
				shiftSign * Math.atan(deltaRotation * planePosition.length());

			const orthogonalToNormal: Vector3 = getOrthogonalVector(normal);
			if (planeNormal.clone().cross(orthogonalToNormal).z < -EPSILON)
				orthogonalToNormal.multiplyScalar(-1);

			// if (i % 1000 === 0)
			// console.log({ normal, orthogonalToNormal, verticalRotationAngle });
			normal.applyAxisAngle(rotation, currentRotation);
			normal.applyAxisAngle(orthogonalToNormal, verticalRotationAngle);
		}

		// Update Normal
		normal.normalize();
		normals.setXYZ(i, normal.x, normal.y, normal.z);

		// Update position
		const updateX =
			position.x * Math.cos(currentRotation) -
			position.y * Math.sin(currentRotation);
		const updateY =
			position.y * Math.cos(currentRotation) +
			position.x * Math.sin(currentRotation);

		positions.setXY(i, updateX, updateY);
	}
	// console.log(normals);
	mesh.geometry.attributes.position.needsUpdate = true;
	mesh.geometry.attributes.normal.needsUpdate = true;
	mesh.geometry.computeBoundingBox();
	mesh.geometry.computeBoundingSphere();
	// TODO: re-compute normals manually
	// mesh.geometry.computeVertexNormals();
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
