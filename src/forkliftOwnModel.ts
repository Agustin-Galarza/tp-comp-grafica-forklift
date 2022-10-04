import { ForkliftSize, LiftSize } from './forklift';
import * as THREE from 'three';

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
	const normals: number[] = [];
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

	for (let i = 0; i < indices.length / 3; i++) {
		let vecA: THREE.Vector3 = reticule[indices[i * 3]];
		let vecB: THREE.Vector3 = reticule[indices[i * 3 + 1]];
		let vecC: THREE.Vector3 = reticule[indices[i * 3 + 2]];
		vecB.sub(vecA);
		vecC.sub(vecA);

		vecB.cross(vecC).normalize();
		vecB.toArray(normals, i * 9);
		vecB.toArray(normals, i * 9 + 3);
		vecB.toArray(normals, i * 9 + 6);
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(bodyVerteces, 3));
	// geometry.setAttribute(
	// 	'normal',
	// 	new THREE.BufferAttribute(new Float32Array(normals), 3)
	// );
	const material = new THREE.MeshStandardMaterial({ color: 0xead312 });

	const mesh = new THREE.Mesh(geometry, material);
	mesh.geometry.computeVertexNormals();
	return mesh;
}
