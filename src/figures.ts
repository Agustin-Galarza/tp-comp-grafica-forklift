import * as THREE from 'three';
import {
	AxesHelper,
	ColorRepresentation,
	Curve,
	Mesh,
	Object3D,
	Vector2,
	Vector3,
} from 'three';

export const figureNames = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
export type FigureName = typeof figureNames[number];

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
	color: ColorRepresentation = 0xa970ff
): Object3D {
	const fig = figures[type];

	let figureObject;
	if (fig.solidType === 'extrude') {
		fig.width = width;
		fig.height = width;
		const points = getShapePoints(fig);
		figureObject = getSimpleExtrudeMesh(points, height, extrusionAngle, color);
		figureObject.rotateX(-Math.PI / 2);
	} else {
		fig.width = width;
		fig.height = height;
		const points = getShapePoints(fig);
		figureObject = getSimpleLatheMesh(points, color);
	}
	figureObject.add(new AxesHelper(5));
	return figureObject;
}

function getSimpleLatheMesh(
	points: Vector2[],
	color: ColorRepresentation
): Mesh {
	const geometry = new THREE.LatheBufferGeometry(points, 50);
	const material = new THREE.MeshPhongMaterial({
		color,
		shininess: 32,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geometry, material);
	return mesh;
}

function twistMesh(mesh: Mesh, angle: number, height: number): Mesh {
	const positions = mesh.geometry.attributes.position.array;
	for (let i = 0; i < positions.length; i += 3) {
		const index = i / 3;
		const pos = new THREE.Vector3(
			positions[i],
			positions[i + 1],
			positions[i + 2]
		);

		const _angle = (pos.z * angle) / (height * 1);
		const updateX = pos.x * Math.cos(_angle) - pos.y * Math.sin(_angle);
		const updateY = pos.y * Math.cos(_angle) + pos.x * Math.sin(_angle);

		mesh.geometry.attributes.position.setX(index, updateX);
		mesh.geometry.attributes.position.setY(index, updateY);
		mesh.geometry.attributes.position.setZ(index, pos.z + height / 2);
	}
	mesh.geometry.attributes.position.needsUpdate = true;
	mesh.geometry.computeBoundingBox();
	mesh.geometry.computeBoundingSphere();
	mesh.geometry.computeVertexNormals();
	return mesh;
}

function getSimpleExtrudeMesh(
	points: Vector2[],
	height: number,
	angle: number,
	color: ColorRepresentation
): Mesh {
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
	});
	const mesh = new THREE.Mesh(geometry, material);
	twistMesh(mesh, angle, height);
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

	const pointsCB = curve.getPoints(50);
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
					[0, 0.25],
					[0, -0.082],
					[1, -0.082],
					[1, 0.25],
				],
				type: 'bezier',
			},
			{
				points: [
					[1, 0.25],
					[1, 0.75],
				],
				type: 'spline',
			},
			{
				points: [
					[1, 0.75],
					[1, 1.082],
					[0, 1.082],
					[0, 0.75],
				],
				type: 'bezier',
			},
			{
				points: [
					[0, 0.75],
					[0, 0.25],
				],
				type: 'spline',
			},
		],
		height: 50,
		width: 50,
		solidType: 'extrude',
	},
};
