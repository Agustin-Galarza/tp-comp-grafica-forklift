const events: Function[] = [];

function getUpdater() {
	function updateAll() {
		events.forEach(ev => ev());
	}
	return {
		updateAll,
	};
}

function registerEvent(updater: Function) {
	events.push(updater);
}

export { getUpdater, registerEvent };
