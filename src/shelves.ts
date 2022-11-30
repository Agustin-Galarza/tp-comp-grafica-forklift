import {
	BoxGeometry,
	Event,
	Mesh,
	MeshPhongMaterial,
	Object3D,
	Vector2,
	Vector3,
} from 'three';
import { BoxShape, Orientation } from './collisionManager';
import { FigureHolder, canTakeFigure } from './figures';
import { isKeyPressed, Key, keyActionCompleted } from './keyControls';
import { EventType, updateCamera, UpdateData } from './updater';

export type Size3 = {
	width: number;
	height: number;
	depth: number;
};

export function createShelves(
	position: Vector2,
	orientation: Orientation,
	sectionSize: Size3,
	{
		baseHeight,
		vSections,
		hSections,
		captureThreshold,
	}: {
		baseHeight?: number;
		vSections?: number;
		hSections?: number;
		captureThreshold?: number;
	}
) {
	return new Shelves(position, orientation, sectionSize, {
		vSections,
		hSections,
		baseHeight,
		captureThreshold,
	});
}

export class Shelves extends BoxShape implements FigureHolder {
	private sections: {
		horizontal: number;
		vertical: number;
		size: Size3;
	};
	readonly mesh;
	private plankHeight = 0.7;
	private poleSize = 1;
	private plankOverhang = 1;
	private objects: (Object3D | undefined)[];
	private captureThreshold;
	private baseHeight;
	private cameraProperties;

	constructor(
		position: Vector2,
		orientation: Orientation,
		sectionSize: Size3,
		{
			vSections = 2,
			hSections = 8,
			captureThreshold = 20,
			baseHeight = 5,
		}: {
			vSections?: number;
			hSections?: number;
			captureThreshold?: number;
			baseHeight?: number;
		}
	) {
		const height =
			baseHeight + vSections * sectionSize.height + (vSections + 1) * 0.7;
		const width = hSections * sectionSize.width;
		const depth = sectionSize.depth;
		super(orientation, width, height, depth);
		this.sections = {
			size: sectionSize,
			horizontal: hSections,
			vertical: vSections,
		};
		this.baseHeight = baseHeight;
		this.mesh = this.generateMesh();
		this.position = position;
		this.objects = new Array(this.sections.horizontal * this.sections.vertical);
		this.captureThreshold = captureThreshold;

		this.cameraProperties = {
			camDistance: new Vector3(40, 40, 40),
			camTarget: () => {
				return this.getWorldPosition();
			},
		} as const;
	}

	get position(): Vector2 {
		const aux = this.positionToCornerPosition(new Vector2());
		return new Vector2(
			this.mesh.position.x - aux.x,
			this.mesh.position.y - aux.y
		);
	}
	protected set position(newPos: Vector2) {
		const meshPos = this.positionToCornerPosition(newPos);
		this.mesh.position.setX(meshPos.x);
		this.mesh.position.setY(meshPos.y);
	}

	private generateMesh(): Mesh {
		const poleRowsAmount = this.sections.horizontal + 1;
		const poleWidthIndentation = this.poleSize / 2;
		const poleRowsWidthSeparation =
			this.sections.size.width - poleWidthIndentation / poleRowsAmount;
		const poleRowsDepthSeparation = this.sections.size.depth;

		const planksAmount = this.sections.vertical + 1;
		const planksWidth = this.width + 2 * this.plankOverhang;
		const planksDepth = this.depth + 2 * this.plankOverhang;
		const planksHeightSeparation = this.sections.size.height + this.plankHeight;

		const poleHeight = this.height;

		// generate poles
		let base: Mesh;
		for (let i = 0; i < 2 * poleRowsAmount; i++) {
			const geometry = new BoxGeometry(
				this.poleSize,
				this.poleSize,
				poleHeight
			);
			const material = new MeshPhongMaterial({ color: 0xabbcbf });
			const mesh = new Mesh(geometry, material);
			mesh.position.set(
				~~(i / 2) * poleRowsWidthSeparation,
				(i % 2) * poleRowsDepthSeparation +
					((-1) ** (i % 2) * this.poleSize) / 2,
				0
			);
			if (i == 0) {
				base = mesh;
			} else {
				base!.add(mesh);
			}
		}

		// generate planks
		for (let i = 0; i < planksAmount; i++) {
			const geometry = new BoxGeometry(
				planksWidth,
				planksDepth,
				this.plankHeight
			);
			const material = new MeshPhongMaterial({ color: 0xf4c02a });
			const mesh = new Mesh(geometry, material);

			mesh.position.set(
				-this.plankOverhang + planksWidth / 2,
				-this.plankOverhang + planksDepth / 2,
				this.baseHeight + i * planksHeightSeparation - poleHeight / 2
			);
			base!.add(mesh);
		}

		// base!.rotateY(-Math.PI / 2);

		const cornerRelativePosition = this.positionToCornerPosition(new Vector2());

		base!.position.set(
			cornerRelativePosition.x,
			cornerRelativePosition.y,
			poleHeight / 2
		);
		base!.rotateZ(this.orientation.value + Math.PI / 2);
		return base!;
	}

	positionToCornerPosition(pos: Vector2) {
		return new Vector2(
			(this.depth / 2) * Math.cos(this.orientation.value) +
				(this.width / 2) * Math.sin(this.orientation.value),
			(this.depth / 2) * Math.sin(this.orientation.value) +
				(this.width / 2) * -Math.cos(this.orientation.value)
		).add(pos);
	}

	private onPressedKeys: {
		[key in Key]?: EventType;
	} = {
		g: this.giveFigures.bind(this),
		3: this.setShelvesCamera.bind(this),
	};

	setShelvesCamera(updateData: UpdateData) {
		updateCamera({
			cameraPosition: this.cameraProperties.camDistance,
			getTarget: this.cameraProperties.camTarget.bind(this),
			pov: false,
			updateData: updateData,
			mesh: this.mesh,
		});
	}

	private giveFigures(updateData: UpdateData) {
		updateData.entities.forEach(entity => {
			if (entity === this) return;
			if (canTakeFigure(entity)) {
				this.giveFigure(entity);
				keyActionCompleted('g');
			}
		});
	}

	update(updateData: UpdateData) {
		Object.entries(this.onPressedKeys).forEach(entry => {
			const key = entry[0] as Key;
			const action = entry[1];
			if (isKeyPressed[key]) {
				action(updateData);
			}
		});
	}

	giveFigure(holder: FigureHolder): void {
		for (let i = 0; i < this.objects.length; i++) {
			if (this.objects[i] === undefined) continue;
			const newFigPos = this.meshCoordToWorldCoord(
				this.shelfCoordToMeshCoord(this.positionToShelfCoord(i))
			);
			const newFig = this.objects[i]!.clone();
			newFig.position.set(newFigPos.x, newFigPos.y, newFigPos.z);
			if (holder.takeFigure(newFig)) {
				newFig.rotateX(-Math.PI / 2);
				this.mesh.remove(this.objects[i]!);
				this.objects[i] = undefined;
			}
		}
	}

	takeFigure(object: Object3D): boolean {
		const pos = this.getPositionToPlace(object);
		if (pos == undefined) return false;

		this.objects[pos] = object;
		this.mesh.add(object);
		// object.rotateX(Math.PI / 2);
		const meshCoord = this.shelfCoordToMeshCoord(
			this.positionToShelfCoord(pos)
		);

		object.position.set(meshCoord.x, meshCoord.y, meshCoord.z);
		return true;
	}

	getWorldPosition(): Vector3 {
		const target = new Vector3();
		this.mesh.getWorldPosition(target);
		target.add(
			new Vector3(
				-(this.width / 2) * Math.sin(this.orientation.value) +
					(this.depth / 2) * Math.cos(this.orientation.value),
				0,
				-(this.width / 2) * Math.cos(this.orientation.value) +
					(this.depth / 2) * Math.sin(this.orientation.value)
			)
		);
		return target;
	}

	private getPositionToPlace(object: Object3D): number | undefined {
		let position = undefined;
		let minDistance: number = Infinity;
		for (let i = 0; i < this.objects.length; i++) {
			const distanceToPosition = this.getDistanceToPosition(i, object);
			if (
				!this.objects[i] &&
				distanceToPosition < this.captureThreshold &&
				distanceToPosition < minDistance
			) {
				position = i;
				minDistance = distanceToPosition;
			}
		}
		return position;
	}

	private getDistanceToPosition(position: number, object: Object3D) {
		const positionInSpace = this.meshCoordToWorldCoord(
			this.shelfCoordToMeshCoord(this.positionToShelfCoord(position))
		);
		return positionInSpace.distanceTo(object.position);
	}

	private meshCoordToWorldCoord(meshCoord: Vector3) {
		return meshCoord.clone().add(this.mesh.position);
	}

	// @ts-ignore
	private shelfCoordToPosition(shelfCoord: Vector2): number {
		return shelfCoord.x + shelfCoord.y * this.sections.horizontal;
	}

	private positionToShelfCoord(position: number): Vector2 {
		const xPos = position % this.sections.horizontal;
		const yPos = ~~(
			(position / this.sections.horizontal) %
			this.sections.vertical
		);

		return new Vector2(xPos, yPos);
	}

	private shelfCoordToMeshCoord(shelfCoord: Vector2): Vector3 {
		const xPos = shelfCoord.x;
		const yPos = shelfCoord.y;

		const depth = this.depth / 2;
		const width = (xPos + 0.5) * this.sections.size.width;

		const height =
			this.baseHeight -
			this.height / 2 +
			((yPos + 1) * this.plankHeight) / 2 +
			yPos * this.sections.size.height;
		return new Vector3(width, depth, height);
	}
	// private toShelvesPosition(position: Vector3){
	//     return position.clone().to
	// }
}
