import { ForkliftSize, LiftSize } from './forklift';
import * as THREE from 'three';
import { loadTexture, TextureLoadParams, loadEnvMap } from './textureLoader';
import {
	Matrix3,
	Mesh,
	MeshBasicMaterial,
	Quaternion,
	SphereGeometry,
	Vector2,
	Vector3,
} from 'three';

// @ts-ignore
export function getOwnModel(forkliftSize: ForkliftSize, liftSize: LiftSize) {
	const l = forkliftSize.length / 2,
		w = forkliftSize.width / 2,
		h = forkliftSize.height / 2;

	const bevelLenRatio = l / 1.5;
	const bevelHeightRatio = h / 1.7;
	const reticule = [
		new THREE.Vector3(-bevelLenRatio, -w, -h),
		new THREE.Vector3(-l, -w, -bevelHeightRatio),
		new THREE.Vector3(-l, -w, bevelHeightRatio),
		new THREE.Vector3(-bevelLenRatio, -w, h),
		new THREE.Vector3(bevelLenRatio, -w, h),
		new THREE.Vector3(l, -w, bevelHeightRatio),
		new THREE.Vector3(l, -w, -bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, -w, -h),
		new THREE.Vector3(-bevelLenRatio, w, -h),
		new THREE.Vector3(-l, w, -bevelHeightRatio),
		new THREE.Vector3(-l, w, bevelHeightRatio),
		new THREE.Vector3(-bevelLenRatio, w, h),
		new THREE.Vector3(bevelLenRatio, w, h),
		new THREE.Vector3(l, w, bevelHeightRatio),
		new THREE.Vector3(l, w, -bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, w, -h),
		new THREE.Vector3(-bevelLenRatio, -w, bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, -w, bevelHeightRatio),
		new THREE.Vector3(-bevelLenRatio, -w, -bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, -w, -bevelHeightRatio),
		new THREE.Vector3(-bevelLenRatio, w, bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, w, bevelHeightRatio),
		new THREE.Vector3(-bevelLenRatio, w, -bevelHeightRatio),
		new THREE.Vector3(bevelLenRatio, w, -bevelHeightRatio),
	];
	// const uvs = reticule.map(
	// 	position =>
	// 		new Vector2(
	// 			(position.x + forkliftSize.length / 2) / forkliftSize.length,
	// 			(position.z + forkliftSize.height / 2) / forkliftSize.height
	// 		)
	// );
	const indices = [
		0, 1, 8, 1, 9, 8, 1, 2, 9, 2, 10, 9, 2, 3, 10, 3, 11, 10, 3, 4, 11, 4, 12,
		11, 4, 5, 12, 5, 13, 12, 5, 6, 13, 6, 14, 13, 6, 7, 14, 7, 15, 14, 7, 0, 15,
		0, 8, 15, 2, 16, 3, 1, 18, 2, 18, 16, 2, 0, 18, 1, 0, 4, 3, 0, 7, 4, 7, 6,
		19, 19, 6, 17, 6, 5, 17, 17, 5, 4, 11, 20, 10, 10, 20, 9, 20, 22, 9, 22, 8,
		9, 11, 12, 8, 12, 15, 8, 12, 13, 21, 21, 13, 14, 21, 14, 23, 23, 14, 15,
	];
	let array: number[] = [];
	indices.forEach((i, index) => reticule[i].toArray(array, 3 * index));
	const bodyVerteces = new Float32Array(array);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(bodyVerteces, 3));

	geometry.computeVertexNormals();

	/**
	 * UV mapping.
	 * Analizando las normales, se pueden encontrar las diferentes caras del objeto (cada cara se compone de todos los puntos de geometry.attributes.position que tienen la misma normal).
	 *
	 * Entonces se puede definir el objeto de Cara (Face), con una serie de puntos y una normal.
	 * Luego, en cada cara, todos sus puntos van a estar contenidos dentro del mismo plano, y en sí cada cara puede ser tratada como un semiplano.
	 * La idea para generar los valores de uv es identificar todas las caras y a cada una rotarla hasta alinearla con el plano XY con alguna punta en el (0,0), calcular los máximos valores de X y de Y y luego establecer los valores de cada punto como u = x/X; y = y/Y.
	 */
	const normals = geometry.attributes.normal;
	const positions = geometry.attributes.position;
	const pointsCount = positions.count;
	type Face = {
		normal: Vector3;
		points: Array<Vector3>;
	};
	const faces: Array<Face> = [];

	let lastNormal = new Vector3();
	for (let i = 0; i < pointsCount; i++) {
		const currentNormal = new Vector3(
			normals.getX(i),
			normals.getY(i),
			normals.getZ(i)
		);
		if (!currentNormal.equals(lastNormal)) {
			faces.push({ normal: currentNormal, points: [] });
			lastNormal = currentNormal;
		}
		const newPosition = new Vector3(
			positions.getX(i),
			positions.getY(i),
			positions.getZ(i)
		);
		if (faces.length === 0) throw new Error('Could not initialize faces array');
		faces[faces.length - 1].points.push(newPosition);
	}

	const uvs: number[] = [];

	for (const face of faces) {
		if (face.points.length === 0 || !face.normal)
			throw new Error('Could not build face correctly');
		// Move plane to origin (take the first point as reference)
		const firstPoint = face.points[0].clone();
		for (let i in face.points) face.points[i].sub(firstPoint);

		/** Rotate Face
		 * Rotation angle comes from cross product between the face's normal and the XY plane's normal (normalized),
		 * and is computed as -atan2(crossProduct, dotProduct)
		 * */

		const xyNormal = new Vector3(0, 0, 1);
		// const rotation: Quaternion = getRotation(face.normal, xyNormal);
		const crossProduct = face.normal.clone().cross(xyNormal).normalize();
		const rotationAngle = face.normal.angleTo(xyNormal);

		const rotation = crossProduct.equals(new Vector3())
			? new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
			: new Quaternion().setFromAxisAngle(crossProduct, -rotationAngle);

		for (let i in face.points) face.points[i].applyQuaternion(rotation);

		const max = new Vector2(-Infinity, -Infinity);
		const min = new Vector2(Infinity, Infinity);

		face.points.forEach(point => {
			// if (point.z != 0) throw new Error('Bad Rotation, z is ' + point.z);
			if (point.x > max.x) max.setX(point.x);
			if (point.y > max.y) max.setY(point.y);
			if (point.x < min.x) min.setX(point.x);
			if (point.y < min.y) min.setY(point.y);
		});

		face.points.forEach(point => {
			uvs.push((point.x + min.x) / (max.x - min.x));
			uvs.push((point.y + min.y) / (max.y - min.y));
		});
	}

	geometry.setAttribute(
		'uv',
		new THREE.BufferAttribute(new Float32Array(uvs), 2)
	);

	const bodyTexture = loadTexture({
		textureName: 'texturaGrua.jpg',
		// textureName: 'uv_map.jpg',
		repeat: new Vector2(2, 2),
		normalMapName: 'texturaGruaNormalMap.jpg',
	} as TextureLoadParams);

	const material = new THREE.MeshStandardMaterial({
		// color: 0xead312,
		map: bodyTexture.map,
		normalMap: bodyTexture.normalMap,
		// wireframe: true,
	});

	const mesh = new THREE.Mesh(geometry, material);

	// const addSphere = (i: number) => {
	// 	const _mesh = new Mesh(new SphereGeometry(0.2), new MeshBasicMaterial());

	// 	_mesh.position.set(positions.getX(i), positions.getY(i), positions.getZ(i));
	// 	mesh.add(_mesh);
	// };

	// for (let i = 0; i < 6; i++) addSphere(i);

	return mesh;
}
