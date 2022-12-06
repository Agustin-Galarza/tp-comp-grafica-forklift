import * as THREE from 'three';
import { Vector2 } from 'three';

const ASSETS_FOLDER = '../res/';
const TEXTURES_PATH = ASSETS_FOLDER + 'textures/';
const NORMAL_MAPS_PATH = ASSETS_FOLDER + 'normalMaps/';
const loader = new THREE.TextureLoader();

// if(loader === undefined){
//     loader = new THREE.TextureLoader();
// }

export type TextureLoadParams = {
	textureName: string;
	repeat: Vector2 | undefined;
	normalMapName: string | undefined;
};

export type Texture = {
	textureMap: any;
	normalMap: any | undefined;
};

export function loadTexture(params: TextureLoadParams) {
	const { textureName, repeat, normalMapName } = params;

	let normalMap = undefined;
	const textureMap = loader.load(TEXTURES_PATH + textureName);

	if (normalMapName != undefined) {
		normalMap = loader.load(NORMAL_MAPS_PATH + normalMapName);
	}

	textureMap.magFilter = THREE.LinearFilter;
	textureMap.minFilter = THREE.LinearMipMapLinearFilter;
	if (repeat != undefined) {
		textureMap.repeat.x = repeat.x;
		textureMap.repeat.y = repeat.y;
		textureMap.wrapS = THREE.RepeatWrapping;
		textureMap.wrapT = THREE.RepeatWrapping;

		if (normalMap != undefined) {
			normalMap.repeat.x = repeat.x;
			normalMap.repeat.y = repeat.y;
			normalMap.wrapS = THREE.RepeatWrapping;
			normalMap.wrapT = THREE.RepeatWrapping;
		}
	}

	return { textureMap, normalMap };
}
