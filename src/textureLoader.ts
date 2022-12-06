import * as THREE from 'three';
import { CubeTextureLoader, Mapping, Texture, Vector2 } from 'three';

const ASSETS_FOLDER = '../res/';
const TEXTURES_PATH = ASSETS_FOLDER + 'textures/';
const NORMAL_MAPS_PATH = ASSETS_FOLDER + 'normalMaps/';
const ENV_MAPS_PATH = ASSETS_FOLDER + 'envMaps/';
const loader = new THREE.TextureLoader();

// if(loader === undefined){
//     loader = new THREE.TextureLoader();
// }

export type TextureLoadParams = {
	textureName: string;
	repeat: Vector2 | undefined;
	normalMapName: string | undefined;
};

export type TextureObject = {
	map: Texture;
	normalMap: Texture | undefined;
};

export function loadTexture(params: TextureLoadParams): TextureObject {
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

	return { map: textureMap, normalMap };
}

export type EnvMapType = 'cube' | 'sphere';

export type EnvMapLoadParams = {
	name: string;
	type: EnvMapType;
};

export function loadEnvMap(params: EnvMapLoadParams): Texture {
	const { name, type } = params;

	const folderName = ENV_MAPS_PATH + name + '/';

	let envMap;

	switch (type) {
		case 'cube':
			const cubeLoader = new CubeTextureLoader();
			cubeLoader.setPath(folderName + 'cube/');
			envMap = cubeLoader.load([
				'right.jpg',
				'left.jpg',
				'top.jpg',
				'bottom.jpg',
				'front.jpg',
				'back.jpg',
			]);
			envMap.format = THREE.RGBFormat;
			envMap.mapping = THREE.CubeReflectionMapping;

			return envMap;
		case 'sphere':
			envMap = loader.load(folderName + 'sphere/map');
			envMap.mapping = THREE.EquirectangularReflectionMapping;
			envMap.magFilter = THREE.LinearFilter;
			envMap.minFilter = THREE.LinearMipMapLinearFilter;
			return envMap;
	}

	throw new Error('Could not load env map');
}
