import {
	AxesHelper,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	SphereBufferGeometry,
	SpotLight,
	Vector3,
} from 'three';

export type SimpleVector3 = {
	x: number;
	y: number;
	z: number;
};

class SpotlightModel {
	readonly light: SpotLight;
	readonly mesh: Mesh;
	constructor(position: Vector3) {
		this.light = new SpotLight();
		this.configLight();

		this.mesh = this.generateMesh();
		this.position = position;
		const lightTarget = new Object3D();
		lightTarget.position.set(0, -position.y, 0);
		this.light.add(lightTarget);
		this.light.target = lightTarget;
	}
	get position() {
		return this.mesh.position.clone();
	}
	set position(pos: Vector3) {
		this.mesh.position.set(pos.x, pos.y, pos.z);
		this.light.position.set(pos.x, pos.y, pos.z);
	}
	private configLight() {
		this.light.angle = Math.PI / 3;
		this.light.distance = 200;
		this.light.power = 2;
		this.light.penumbra = Math.PI / 2;
	}
	generateMesh(): Mesh {
		const width = 2;
		const height = 10;

		let geometry = new SphereBufferGeometry(width * 0.8);
		let material = new MeshBasicMaterial({ color: 0xffffff });
		const lampMesh = new Mesh(geometry, material);

		return lampMesh;
	}
}

function generateSpotlight(position: Vector3): SpotlightModel {
	return new SpotlightModel(position);
}

export { generateSpotlight };
