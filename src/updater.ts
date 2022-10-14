import { Object3D } from 'three';
import { BoxShape } from './collisionManager';

export type UpdateData = {
	dt: number;
	entities: Entity[];
};

export type Entity = (Object3D | BoxShape) & {
	update(updateData: UpdateData): void;
};

export type EventType =
	| ((data: UpdateData) => {})
	| ((data: UpdateData) => void);

function getUpdater() {
	const events: EventType[] = [];
	const entities: Entity[] = [];
	function updateAll(dt: number) {
		const updateData: UpdateData = {
			dt,
			entities,
		};
		events.forEach(ev => ev(updateData));
		entities.forEach(entity => entity.update(updateData));
	}
	function registerEvent(updater: EventType) {
		events.push(updater);
	}

	function registerEntity(entity: Entity) {
		entities.push(entity);
	}
	return {
		updateAll,
		registerEvent,
		registerEntity,
	};
}
const updater = getUpdater();
export default updater;
