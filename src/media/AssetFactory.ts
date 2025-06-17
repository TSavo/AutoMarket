/**
 * AssetFactory
 *
 * Factory for creating asset class instances from plain objects.
 */

import { BaseAsset, MediaType } from './types';
import { BaseAssetClass } from './BaseAssetClass';
import { ImageAsset } from './image';
import { ImageAssetClass } from './ImageAssetClass'; // Corrected import path
import { VideoAsset } from './video';
import { VideoAssetClass } from './VideoAssetClass'; // Corrected import path
import { FontAsset } from './font';
import { FontAssetClass } from './FontAssetClass'; // Corrected import path
import { AudioAsset } from './audio';
import { AudioAssetClass } from './audio/AudioAssetClass';

/**
 * Create an asset class instance from a plain object
 * @param asset The asset data to create an instance from
 * @returns An asset class instance
 */
export function createAsset(asset: BaseAsset): BaseAssetClass {
  switch (asset.type) {
    case MediaType.IMAGE:
      return new ImageAssetClass(asset as ImageAsset);
    case MediaType.VIDEO:
      return new VideoAssetClass(asset as VideoAsset);
    case MediaType.AUDIO: // Added Audio case
      return new AudioAssetClass(asset as AudioAsset);
    case MediaType.FONT:
      return new FontAssetClass(asset as FontAsset);
    // Add other asset types as needed
    default:
      return new BaseAssetClass(asset);
  }
}

/**
 * Create an asset class instance from a plain object with type checking
 * @param asset The asset data to create an instance from
 * @returns An asset class instance with the correct type
 */
export function createTypedAsset<T extends BaseAsset>(asset: T): BaseAssetClass {
  return createAsset(asset);
}

/**
 * Create an image asset class instance from a plain object
 * @param asset The image asset data to create an instance from
 * @returns An image asset class instance
 */
export function createImageAsset(asset: ImageAsset): ImageAssetClass {
  return new ImageAssetClass(asset);
}

/**
 * Create a video asset class instance from a plain object
 * @param asset The video asset data to create an instance from
 * @returns A video asset class instance
 */
export function createVideoAsset(asset: VideoAsset): VideoAssetClass {
  return new VideoAssetClass(asset);
}

/**
 * Create an audio asset class instance from a plain object
 * @param asset The audio asset data to create an instance from
 * @returns An audio asset class instance
 */
export function createAudioAsset(asset: AudioAsset): AudioAssetClass {
  return new AudioAssetClass(asset);
}

/**
 * Create a font asset class instance from a plain object
 * @param asset The font asset data to create an instance from
 * @returns A font asset class instance
 */
export function createFontAsset(asset: FontAsset): FontAssetClass {
  return new FontAssetClass(asset);
}

/**
 * Convert an asset class instance to a plain object
 * @param asset The asset class instance to convert
 * @returns A plain object representation of the asset
 */
export function assetToObject(asset: BaseAssetClass): BaseAsset {
  return asset.toObject();
}

/**
 * Convert an array of asset class instances to plain objects
 * @param assets The asset class instances to convert
 * @returns An array of plain object representations of the assets
 */
export function assetsToObjects(assets: BaseAssetClass[]): BaseAsset[] {
  return assets.map(asset => asset.toObject());
}
