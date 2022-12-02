import { BackSide, BufferGeometry, FrontSide, Material, Vector2 } from 'three';
import {
	AxesHelper,
	CylinderGeometry,
	Group,
	LatheGeometry,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	SphereBufferGeometry,
	SphereGeometry,
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
	constructor(position: Vector3, roofHeight: number) {
		this.light = new SpotLight();
		this.configLight(position);

		this.mesh = this.generateMesh(position, roofHeight);
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
	private configLight(position: Vector3) {
		this.light.angle = Math.PI / 3;
		this.light.distance = 0;
		this.light.power = 1;
		this.light.penumbra = 1;
	}
	private generateMesh(position: Vector3, roofHeight: number): Mesh {
		const height = 5;
		const width = height * 2 * 0.75;

		// Generate light
		let geometry: BufferGeometry = new SphereBufferGeometry((height / 2) * 0.5);
		let material: Material = new MeshBasicMaterial({ color: 0xffffff });
		const lampMesh = new Mesh(geometry, material);

		// Generate lamp cover
		const pointsAmount = 20;
		const a = (-4 * height) / width ** 2;
		const c = height;
		const points = Array.from(
			{ length: pointsAmount },
			(element, index) => (index * (width / 2)) / pointsAmount
		).map(x => new Vector2(x, a * x ** 2 + c));

		geometry = new LatheGeometry(points, 10);
		material = new MeshBasicMaterial({ color: 0x1f1f1f });
		material.side = BackSide;
		const coverMesh = new Mesh(geometry, material);
		material = new MeshBasicMaterial({ color: 0xffffff });
		material.side = FrontSide;
		const innerCoverMesh = new Mesh(geometry, material);

		const yDisplacement = height * 0.4;
		coverMesh.position.sub(new Vector3(0, yDisplacement, 0));
		innerCoverMesh.position.sub(new Vector3(0, yDisplacement, 0));
		innerCoverMesh.scale.set(0.95, 0.95, 0.95);

		lampMesh.add(coverMesh);
		lampMesh.add(innerCoverMesh);

		// Generate rod
		const cableHeight = roofHeight - position.y + 0.3;
		const cableWidth = 0.1;
		const cable = new Mesh(
			new CylinderGeometry(cableWidth, cableWidth, cableHeight),
			new MeshBasicMaterial({ color: 0x000000 })
		);
		cable.position.set(0, cableHeight / 2 + height / 2 + 0.5, 0);
		lampMesh.add(cable);

		return lampMesh;
	}
}

function generateSpotlight(
	position: Vector3,
	roofHeight: number
): SpotlightModel {
	return new SpotlightModel(position, roofHeight);
}

export { generateSpotlight };
