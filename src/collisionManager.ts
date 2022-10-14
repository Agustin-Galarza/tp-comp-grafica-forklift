import { Vector2 } from 'three';

export default class CollisionManager<T extends BoxShape & Moving> {
	readonly object: T;
	readonly bodies: BoxShape[];
	readonly room: Room;
	constructor(movingObject: T, room: Room, ...obstacles: BoxShape[]) {
		this.object = movingObject;
		this.bodies = obstacles;
		this.room = room;
	}
	update(dt: number) {
		this.resolveRoomCollision();

		for (let body of this.bodies) {
			this.resolveCollisionWithBody(body);
		}
	}
	private collide(obj1: AABB, obj2: AABB): boolean {
		return (
			obj1.xMin < obj2.xMax &&
			obj1.xMax > obj2.xMin &&
			obj1.yMin < obj2.yMax &&
			obj1.yMax > obj2.yMin
		);
	}
	private resolveCollisionWithBody(body: BoxShape) {
		const objectAABB = this.object.getAABB();
		const bodyAABB = body.getAABB();
		if (this.collide(objectAABB, bodyAABB)) {
			// get collision vector
			const colVec = new Vector2().subVectors(
				body.position,
				this.object.position
			);
			const colX =
				colVec.x > 0
					? objectAABB.xMax - bodyAABB.xMin
					: bodyAABB.xMax - objectAABB.xMin;
			const colY =
				colVec.y > 0
					? objectAABB.yMax - bodyAABB.yMin
					: bodyAABB.yMax - objectAABB.yMin;
			// correct position by the minimun overlap
			let dx = 0,
				dy = 0;
			if (colX <= colY) {
				dx = -Math.sign(colVec.x) * colX;
			} else {
				dy = -Math.sign(colVec.y) * colY;
			}
			this.object.updatePosition(dx, dy);
		}
	}
	private resolveRoomCollision() {
		const objectAABB = this.object.getAABB();
		const roomAABB = this.room.getAABB();
		let dx = 0,
			dy = 0;
		if (roomAABB.xMax < objectAABB.xMax) {
			dx = roomAABB.xMax - objectAABB.xMax;
		} else if (roomAABB.xMin > objectAABB.xMin) {
			dx = roomAABB.xMin - objectAABB.xMin;
		}
		if (roomAABB.yMax < objectAABB.yMax) {
			dy = roomAABB.yMax - objectAABB.yMax;
		} else if (roomAABB.yMin > objectAABB.yMin) {
			dy = roomAABB.yMin - objectAABB.yMin;
		}

		this.object.updatePosition(dx, dy);
	}
}

export class Orientation {
	private _val: number = 0;
	constructor(angle: number = 0) {
		this.value = angle;
	}
	set value(val: number) {
		while (val < 0) {
			val += 2 * Math.PI;
		}
		while (val >= 2 * Math.PI) {
			val -= 2 * Math.PI;
		}
		this._val = val;
	}
	get value() {
		return this._val;
	}
	rotate(angle: number) {
		this.value += angle;
	}
}

export type AABB = {
	xMax: number;
	xMin: number;
	yMax: number;
	yMin: number;
};

export abstract class BoxShape {
	readonly width: number;
	readonly height: number;
	readonly depth: number;
	readonly orientation: Orientation;
	constructor(
		orientation: Orientation,
		width: number,
		height: number,
		depth: number
	) {
		this.orientation = orientation;
		this.width = width;
		this.height = height;
		this.depth = depth;
	}
	abstract get position();
	protected abstract set position(newPos: Vector2);
	asArray(): number[] {
		return [this.width, this.height, this.depth];
	}
	getAABB(): AABB {
		const zero = () => new Vector2();
		const front = new Vector2(this.depth / 2).rotateAround(
			zero(),
			this.orientation.value
		);
		const back = new Vector2(this.depth / 2).rotateAround(
			zero(),
			this.orientation.value + Math.PI
		);
		const right = new Vector2(this.width / 2).rotateAround(
			zero(),
			this.orientation.value - Math.PI / 2
		);
		const left = new Vector2(this.width / 2).rotateAround(
			zero(),
			this.orientation.value + Math.PI / 2
		);

		const corners = [
			new Vector2().copy(this.position).add(front).add(right),
			new Vector2().copy(this.position).add(front).add(left),
			new Vector2().copy(this.position).add(back).add(right),
			new Vector2().copy(this.position).add(back).add(left),
		];
		return {
			xMax: Math.max(...corners.map(p => p.x)),
			xMin: Math.min(...corners.map(p => p.x)),
			yMax: Math.max(...corners.map(p => p.y)),
			yMin: Math.min(...corners.map(p => p.y)),
		};
	}
}

export interface Moving {
	updatePosition(x: number, y: number): void;
}

export abstract class Room extends BoxShape {
	constructor(width: number, depth: number, height: number) {
		super(new Orientation(), width, height, depth);
	}
	getAABB(): AABB {
		return {
			xMax: this.width / 2,
			xMin: -this.width / 2,
			yMax: this.depth / 2,
			yMin: -this.depth / 2,
		};
	}
	// @ts-ignore
	rotate(angle: number): void {}
}
