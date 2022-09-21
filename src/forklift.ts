import { Mesh } from 'three';
import { getHangar, Hangar } from './hangar';
import * as THREE from 'three';

export type Forklift = {
	accelerate: () => void;
	decelerate: () => void;
	reset: () => void;
	turnLeft: () => void;
	turnRight: () => void;
	updatePosition: () => void;
	getPosition: () => { x: number; y: number; z: number; orientation: number };
	getMesh: () => Mesh;
	liftUp: () => void;
	liftDown: () => void;
	mesh: Mesh;
};

type LiftRange = {
	top: number;
	bottom: number;
};

export type LiftSize = {
	height: number;
	length: number;
};

export type ForkliftSize = {
	length: number;
	width: number;
	height: number;
};

export type ForkliftProperties = {
	turnSensitivity: number;
	speed: number;
	liftSensitivity: number;
	size: ForkliftSize;
	liftSize: LiftSize;
};

let forklift: Forklift | undefined = undefined;

function getForklift() {
	return forklift;
}

function createForklift(properties: ForkliftProperties) {
	let _turnSensitivity = properties.turnSensitivity;
	let _speed = properties.speed;
	let _mesh = generateForkliftMesh(properties.size, properties.liftSize);
	let _deltaMovement = 0;
	let _size = properties.size;
	let _liftSize = properties.liftSize;
	let _position = {
		x: 0,
		y: 0,
		z: _size.height / 2,
		orientation: 0,
	};
	let _liftRange: LiftRange = {
		top: (_size.height * 3) / 2,
		bottom: -_size.height / 2 + _liftSize.height / 2,
	};
	let hangar: Hangar = getHangar()!;
	function accelerate() {
		_deltaMovement += _speed;
		_animateWheels();
	}
	function decelerate() {
		_deltaMovement -= _speed;
		_animateWheels(true);
	}
	function reset() {
		_deltaMovement = 0;
	}
	function turnLeft() {
		_position.orientation += _turnSensitivity;
		while (_position.orientation >= 2 * Math.PI) {
			_position.orientation -= 2 * Math.PI;
		}
	}
	function turnRight() {
		_position.orientation -= _turnSensitivity;
		while (_position.orientation < 0) {
			_position.orientation += 2 * Math.PI;
		}
	}
	function liftUp() {
		const lift = _getLift()!;
		if (lift.position.z >= _liftRange.top) return;
		lift.translateZ(properties.liftSensitivity);
	}
	function liftDown() {
		const lift = _getLift()!;
		if (lift.position.z <= _liftRange.bottom) return;
		lift.translateZ(-properties.liftSensitivity);
	}
	function updatePosition() {
		let x_pos = _position.x + _deltaMovement * Math.cos(_position.orientation);
		let y_pos = _position.y + _deltaMovement * Math.sin(_position.orientation);

		let x_front =
			(_size.length / 2 + _liftSize.length) * Math.cos(_position.orientation) +
			(_size.width / 2) * Math.sin(_position.orientation);
		let y_front =
			(_size.length / 2 + _liftSize.length) * Math.sin(_position.orientation) +
			(_size.width / 2) * Math.cos(_position.orientation);
		let x_back =
			(_size.length / 2) * Math.cos(_position.orientation + Math.PI) +
			(_size.width / 2) * Math.sin(_position.orientation + Math.PI);
		let y_back =
			(_size.length / 2) * Math.sin(_position.orientation + Math.PI) +
			(_size.width / 2) * Math.cos(_position.orientation + Math.PI);

		if (
			!hangar.isOutOfBoundsX(x_pos + x_front) &&
			!hangar.isOutOfBoundsX(x_pos + x_back)
		) {
			_position.x = x_pos;
		} else {
			_position.x =
				Math.sign(_position.x) * (hangar.size.width / 2 - Math.abs(x_front));
		}
		if (
			!hangar.isOutOfBoundsY(y_pos + y_back) &&
			!hangar.isOutOfBoundsY(y_pos + y_front)
		) {
			_position.y = y_pos;
		} else {
			_position.y =
				Math.sign(_position.y) * (hangar.size.width / 2 - Math.abs(y_front));
		}

		_updateMeshPosition();
	}
	function _updateMeshPosition() {
		_mesh.position.x = _position.x;
		_mesh.position.y = _position.y;
		_mesh.rotation.z = _position.orientation;
	}
	function getPosition() {
		return _position;
	}
	function getMesh() {
		return _mesh;
	}
	function _getLift() {
		return _mesh.getObjectByName('lift');
	}
	function _animateWheels(reverse = false) {
		for (let i = 0; i < 4; i++) {
			const wheel = _mesh.getObjectByName('wheel' + i)!;
			wheel.rotateY((reverse ? -1 : 1) * 0.1);
		}
	}

	_updateMeshPosition();

	forklift = {
		accelerate,
		decelerate,
		reset,
		turnLeft,
		turnRight,
		updatePosition,
		getPosition,
		getMesh,
		liftUp,
		liftDown,
		mesh: _mesh,
	};
	return forklift;
}

function generateForkliftMesh(forkliftSize: ForkliftSize, liftSize: LiftSize) {
	//body
	let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(
		forkliftSize.width,
		forkliftSize.height,
		forkliftSize.length
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	let material = new THREE.MeshStandardMaterial({ color: 0xfdda0d });
	const bodyMesh = new THREE.Mesh(geometry, material);

	//lift
	geometry = new THREE.BoxGeometry(
		forkliftSize.width,
		liftSize.height,
		liftSize.length
	);
	geometry.rotateX(Math.PI / 2);
	geometry.rotateZ(Math.PI / 2);
	material = new THREE.MeshStandardMaterial({ color: 0xffbf00 });
	const liftMesh = new Mesh(geometry, material);
	liftMesh.name = 'lift';
	bodyMesh.add(liftMesh);
	liftMesh.translateX(forkliftSize.length / 2 + liftSize.length / 2);

	//wheels
	const wheelSize = {
		radius: forkliftSize.length / 6,
		width: 0.4,
	};
	for (let i = 0; i < 4; i++) {
		geometry = new THREE.CylinderGeometry(
			wheelSize.radius,
			wheelSize.radius,
			wheelSize.width,
			14,
			1,
			false
		);
		material = new THREE.MeshStandardMaterial({ color: 0x2f2a2d });
		const wheelMesh = new Mesh(geometry, material);
		wheelMesh.name = 'wheel' + i;
		bodyMesh.add(wheelMesh);

		wheelMesh.translateX(((i < 2 ? 1 : -1) * forkliftSize.length) / 3);
		wheelMesh.translateY(
			(i % 2 == 0 ? 1 : -1) * (forkliftSize.width / 2 + wheelSize.width / 2)
		);
		wheelMesh.translateZ(-forkliftSize.height / 2);
	}

	bodyMesh.translateZ(forkliftSize.height / 2 + wheelSize.radius);

	return bodyMesh;
}

export { createForklift, getForklift };
