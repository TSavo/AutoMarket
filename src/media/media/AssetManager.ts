import { MediaAssetStore } from './MediaAssetStore';
import {
  BaseAsset,
  BaseFilterOptions,
  ContentPurpose,
  AspectRatio
} from './types';
import {
  ImageAsset,
  ImageFilterOptions,
  isImageAsset
} from './image';
import {
  VideoAsset,
  VideoFilterOptions,
  isVideoAsset
} from './video';
import {
  AudioAsset,
  AudioFilterOptions,
  isAudioAsset
} from './audio';
import {
  FontAsset,
  FontFilterOptions,
  isFontAsset
} from './font';
import { BaseAssetClass } from './BaseAssetClass';
import { ImageAssetClass } from './ImageAssetClass';
import { VideoAssetClass } from './VideoAssetClass';
import { FontAssetClass } from './FontAssetClass';
import { AudioAssetClass } from './audio/AudioAssetClass';
import { createAsset, createImageAsset, createVideoAsset, createFontAsset, createAudioAsset, assetToObject } from './AssetFactory';

/**
 * Main Asset Manager for Horizon City Stories media
 * Provides typesafe access to media assets
 */
export class AssetManager {
  private store: MediaAssetStore;
  private initialized: boolean = false;

  /**
   * Create a new AssetManager instance
   * @param databasePath Path to the media database JSON file (relative to project root)
   */
  constructor(databasePath?: string) {
    this.store = new MediaAssetStore(databasePath);
  }

  /**
   * Initialize the asset manager
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('AssetManager already initialized, skipping initialization.');
      return;
    }

    try {
      console.log('Initializing AssetManager...');
      await this.store.initialize();
      this.initialized = true;
      console.log('AssetManager initialization complete.');
    } catch (error) {
      console.error('Failed to initialize AssetManager:', error);
      // Reset initialization state on failure
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if the asset manager is initialized
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all media assets with optional filtering
   * @param options Optional filter criteria
   * @returns Array of filtered assets
   * @typeParam T - The specific asset type to return (must extend BaseAsset)
   */
  public getMedia<T extends BaseAsset = BaseAsset>(options?: BaseFilterOptions): T[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // If no options provided, return all assets (cast to the requested type)
    if (!options) {
      return assets as T[];
    }

    // Filter assets based on the provided options
    return this.filterAssets(assets, options) as T[];
  }

  /**
   * Get image assets with optional filtering
   * @param options Optional filter criteria specific to images
   * @returns Array of filtered image assets
   */
  public getImages(options?: ImageFilterOptions): ImageAsset[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter for image assets only
    const imageAssets = assets.filter(isImageAsset);

    // If no options provided, return all image assets
    if (!options) {
      return imageAssets;
    }

    // Filter image assets based on the provided options
    return this.filterImageAssets(imageAssets, options);
  }

  /**
   * Get video assets with optional filtering
   * @param options Optional filter criteria specific to videos
   * @returns Array of filtered video assets
   */
  public getVideos(options?: VideoFilterOptions): VideoAsset[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter for video assets only
    const videoAssets = assets.filter(isVideoAsset);

    // If no options provided, return all video assets
    if (!options) {
      return videoAssets;
    }

    // Filter video assets based on the provided options
    return this.filterVideoAssets(videoAssets, options);
  }

  /**
   * Get audio assets with optional filtering
   * @param options Optional filter criteria specific to audio
   * @returns Array of filtered audio assets
   */
  public getAudio(options?: AudioFilterOptions): AudioAsset[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter for audio assets only
    const audioAssets = assets.filter(isAudioAsset);

    // If no options provided, return all audio assets
    if (!options) {
      return audioAssets;
    }

    // Filter audio assets based on the provided options
    return this.filterAudioAssets(audioAssets, options);
  }

  /**
   * Get font assets with optional filtering
   * @param options Optional filter criteria specific to fonts
   * @returns Array of filtered font assets
   */
  public getFonts(options?: FontFilterOptions): FontAsset[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter for font assets only
    const fontAssets = assets.filter(isFontAsset);

    // If no options provided, return all font assets
    if (!options) {
      return fontAssets;
    }

    // Filter font assets based on the provided options
    return this.filterFontAssets(fontAssets, options);
  }

  /**
   * Get a specific asset by ID
   * @param id The asset ID
   * @returns The asset or undefined if not found
   * @typeParam T - The specific asset type to return (must extend BaseAsset)
   */
  public getAssetById<T extends BaseAsset = BaseAsset>(id: string): T | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset) {
      return undefined;
    }

    // Return the plain object if requested
    return asset as T;
  }

  /**
   * Get a specific asset by ID as an asset class instance
   * @param id The asset ID
   * @returns The asset class instance or undefined if not found
   * @typeParam T - The specific asset class type to return (must extend BaseAssetClass)
   */
  public getAssetClassById<T extends BaseAssetClass = BaseAssetClass>(id: string): T | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset) {
      return undefined;
    }

    // Create the appropriate asset class instance
    return createAsset(asset) as T;
  }

  /**
   * Get a specific video asset by ID as a VideoAssetClass instance
   * @param id The asset ID
   * @returns The VideoAssetClass instance or undefined if not found or not a video
   */
  public getVideoAssetById(id: string): VideoAssetClass | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset || !isVideoAsset(asset)) {
      return undefined;
    }

    return createVideoAsset(asset);
  }

  /**
   * Get a specific image asset by ID as an ImageAssetClass instance
   * @param id The asset ID
   * @returns The ImageAssetClass instance or undefined if not found or not an image
   */
  public getImageAssetById(id: string): ImageAssetClass | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset || !isImageAsset(asset)) {
      return undefined;
    }

    return createImageAsset(asset);
  }

  /**
   * Get a specific audio asset by ID as an AudioAssetClass instance
   * @param id The asset ID
   * @returns The AudioAssetClass instance or undefined if not found or not audio
   */
  public getAudioAssetById(id: string): AudioAssetClass | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset || !isAudioAsset(asset)) {
      return undefined;
    }

    return createAudioAsset(asset);
  }

  /**
   * Get a specific font asset by ID as a FontAssetClass instance
   * @param id The asset ID
   * @returns The FontAssetClass instance or undefined if not found or not a font
   */
  public getFontAssetById(id: string): FontAssetClass | undefined {
    this.checkInitialized();
    const asset = this.store.getAssetById(id);

    if (!asset || !isFontAsset(asset)) {
      return undefined;
    }

    return createFontAsset(asset);
  }

  /**
   * Add a new asset to the database
   * @param asset The asset to add (plain object or asset class instance)
   * @returns Promise that resolves to the added asset
   * @typeParam T - The specific asset type to add and return
   */
  public async addAsset<T extends BaseAsset | BaseAssetClass>(asset: T): Promise<T> {
    this.checkInitialized();

    // If it's an asset class instance, convert it to a plain object
    const assetObject = asset instanceof BaseAssetClass
      ? asset.toObject()
      : asset as BaseAsset;

    // Add the asset to the store
    const addedAsset = await this.store.addAsset(assetObject);

    // If the input was an asset class instance, return a new instance with the added asset data
    if (asset instanceof BaseAssetClass) {
      // Create a new instance of the same class with the added asset data
      const newInstance = createAsset(addedAsset);
      return newInstance as unknown as T;
    }

    // Otherwise, return the plain object
    return addedAsset as unknown as T;
  }

  /**
   * Update an existing asset in the database
   * @param asset The asset to update (plain object or asset class instance)
   * @returns Promise that resolves to the updated asset
   * @typeParam T - The specific asset type to update and return
   */
  public async updateAsset<T extends BaseAsset | BaseAssetClass>(asset: T): Promise<T> {
    this.checkInitialized();

    // If it's an asset class instance, convert it to a plain object
    const assetObject = asset instanceof BaseAssetClass
      ? asset.toObject()
      : asset as BaseAsset;

    // Update the asset in the store
    const updatedAsset = await this.store.updateAsset(assetObject);

    // If the input was an asset class instance, return a new instance with the updated asset data
    if (asset instanceof BaseAssetClass) {
      // Create a new instance of the same class with the updated asset data
      const newInstance = createAsset(updatedAsset);
      return newInstance as unknown as T;
    }

    // Otherwise, return the plain object
    return updatedAsset as unknown as T;
  }

  /**
   * Remove an asset from the database
   * @param id The ID of the asset to remove
   * @returns Promise that resolves to true if the asset was removed, false otherwise
   */
  public async removeAsset(id: string): Promise<boolean> {
    this.checkInitialized();
    return this.store.removeAsset(id);
  }

  /**
   * Get assets by content purpose
   * @param purpose The content purpose to filter by
   * @returns Array of assets with the specified content purpose
   */
  public getByContentPurpose<T extends BaseAsset>(purpose: ContentPurpose): T[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter assets by content purpose
    return assets.filter(asset =>
      asset.contentPurpose.includes(purpose)
    ) as T[];
  }

  /**
   * Get assets by tag
   * @param tag The tag to filter by
   * @returns Array of assets with the specified tag
   * @typeParam T - The specific asset type to return (must extend BaseAsset)
   */
  public getByTag<T extends BaseAsset = BaseAsset>(tag: string): T[] {
    this.checkInitialized();

    // Get all assets from the store
    const assets = this.store.getAllAssets();

    // Filter assets by tag
    return assets.filter(asset =>
      asset.tags.includes(tag)
    ) as T[];
  }

  /**
   * Get all videos with a specific aspect ratio
   * @param aspectRatio The aspect ratio to filter by
   * @returns Array of video assets with the specified aspect ratio
   */
  public getVideosByAspectRatio(aspectRatio: AspectRatio | string): VideoAsset[] {
    return this.getVideos({
      aspectRatio
    });
  }

  /**
   * Get all videos that are shorter than a specified duration
   * @param seconds Maximum duration in seconds
   * @returns Array of video assets shorter than the specified duration
   */
  public getShortVideos(seconds: number): VideoAsset[] {
    return this.getVideos({
      maxDuration: seconds
    });
  }

  /**
   * Get all marketing videos (tagged as "marketing")
   * @returns Array of video assets tagged as "marketing"
   */
  public getMarketingVideos(): VideoAsset[] {
    return this.getVideos({
      tags: ['marketing']
    });
  }

  /**
   * Get all intro videos (with content purpose "intro")
   * @returns Array of video assets with content purpose "intro"
   */
  public getIntroVideos(): VideoAsset[] {
    return this.getVideos({
      contentPurpose: [ContentPurpose.INTRO]
    });
  }

  /**
   * Get images by aspect ratio
   * @param aspectRatio The aspect ratio to filter by
   * @returns Array of image assets with the specified aspect ratio
   */
  public getImagesByAspectRatio(aspectRatio: AspectRatio | string): ImageAsset[] {
    return this.getImages({
      aspectRatio
    });
  }

  /**
   * Check if an asset already exists with the given path
   * @param path The asset path to check
   * @returns True if an asset with this path exists, false otherwise
   */
  public assetExistsByPath(path: string): boolean {
    this.checkInitialized();
    const assets = this.store.getAllAssets();
    return assets.some(asset => asset.path === path);
  }

  /**
   * Get an asset by its path
   * @param path The asset path
   * @returns The asset or undefined if not found
   * @typeParam T - The specific asset type to return (must extend BaseAsset)
   */
  public getAssetByPath<T extends BaseAsset = BaseAsset>(path: string): T | undefined {
    this.checkInitialized();
    const assets = this.store.getAllAssets();
    const asset = assets.find(asset => asset.path === path);
    return asset as T | undefined;
  }

  /**
   * Filter assets based on base filter options
   * @param assets The assets to filter
   * @param options The filter options
   * @returns Filtered assets
   */
  private filterAssets(assets: BaseAsset[], options: BaseFilterOptions): BaseAsset[] {
    return assets.filter(asset => {
      // Check tags
      if (options.tags && options.tags.length > 0) {
        // Must match at least one tag
        if (!options.tags.some(tag => asset.tags.includes(tag))) {
          return false;
        }
      }

      // Check content purpose
      if (options.contentPurpose && options.contentPurpose.length > 0) {
        // Must match at least one content purpose
        if (!options.contentPurpose.some(purpose => asset.contentPurpose.includes(purpose))) {
          return false;
        }
      }

      // Check file size
      if (options.maxFileSize !== undefined && asset.fileSize > options.maxFileSize) {
        return false;
      }
      if (options.minFileSize !== undefined && asset.fileSize < options.minFileSize) {
        return false;
      }

      // Check author
      if (options.author !== undefined && asset.author !== options.author) {
        return false;
      }

      // Check license
      if (options.license !== undefined && asset.license !== options.license) {
        return false;
      }

      // Check date created
      if (options.dateCreatedAfter !== undefined && new Date(asset.dateCreated) < new Date(options.dateCreatedAfter)) {
        return false;
      }
      if (options.dateCreatedBefore !== undefined && new Date(asset.dateCreated) > new Date(options.dateCreatedBefore)) {
        return false;
      }

      // Check date modified
      if (options.dateModifiedAfter !== undefined && new Date(asset.dateModified) < new Date(options.dateModifiedAfter)) {
        return false;
      }
      if (options.dateModifiedBefore !== undefined && new Date(asset.dateModified) > new Date(options.dateModifiedBefore)) {
        return false;
      }

      // Check search text in title and description
      if (options.searchText !== undefined) {
        const searchLower = options.searchText.toLowerCase();
        if (!asset.title.toLowerCase().includes(searchLower) &&
            (!asset.description || !asset.description.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      // If all checks pass, include the asset
      return true;
    });
  }

  /**
   * Filter image assets based on image-specific filter options
   * @param assets The image assets to filter
   * @param options The image filter options
   * @returns Filtered image assets
   */
  private filterImageAssets(assets: ImageAsset[], options: ImageFilterOptions): ImageAsset[] {
    // First apply base filtering
    const baseFiltered = this.filterAssets(assets, options) as ImageAsset[];

    // Then apply image-specific filtering
    return baseFiltered.filter(asset => {
      // Check format
      if (options.format && options.format.length > 0 && !options.format.includes(asset.format)) {
        return false;
      }

      // Check aspect ratio
      if (options.aspectRatio !== undefined && asset.aspectRatio !== options.aspectRatio) {
        return false;
      }

      // Check width
      if (options.maxWidth !== undefined && asset.width > options.maxWidth) {
        return false;
      }
      if (options.minWidth !== undefined && asset.width < options.minWidth) {
        return false;
      }

      // Check height
      if (options.maxHeight !== undefined && asset.height > options.maxHeight) {
        return false;
      }
      if (options.minHeight !== undefined && asset.height < options.minHeight) {
        return false;
      }

      // Check if optimized
      if (options.optimized !== undefined && asset.optimized !== options.optimized) {
        return false;
      }

      // Check if has responsive versions
      if (options.hasResponsiveVersions !== undefined && asset.hasResponsiveVersions !== options.hasResponsiveVersions) {
        return false;
      }

      // If all checks pass, include the asset
      return true;
    });
  }

  /**
   * Filter video assets based on video-specific filter options
   * @param assets The video assets to filter
   * @param options The video filter options
   * @returns Filtered video assets
   */
  private filterVideoAssets(assets: VideoAsset[], options: VideoFilterOptions): VideoAsset[] {
    // First apply base filtering
    const baseFiltered = this.filterAssets(assets, options) as VideoAsset[];

    // Then apply video-specific filtering
    return baseFiltered.filter(asset => {
      // Check format
      if (options.format && options.format.length > 0 && !options.format.includes(asset.format)) {
        return false;
      }

      // Check aspect ratio
      if (options.aspectRatio !== undefined && asset.aspectRatio !== options.aspectRatio) {
        return false;
      }

      // Check width
      if (options.maxWidth !== undefined && asset.width > options.maxWidth) {
        return false;
      }
      if (options.minWidth !== undefined && asset.width < options.minWidth) {
        return false;
      }

      // Check height
      if (options.maxHeight !== undefined && asset.height > options.maxHeight) {
        return false;
      }
      if (options.minHeight !== undefined && asset.height < options.minHeight) {
        return false;
      }

      // Check duration
      if (options.maxDuration !== undefined && asset.duration > options.maxDuration) {
        return false;
      }
      if (options.minDuration !== undefined && asset.duration < options.minDuration) {
        return false;
      }

      // Check if has audio
      if (options.hasAudio !== undefined && asset.hasAudio !== options.hasAudio) {
        return false;
      }

      // Check if has captions
      if (options.hasCaptions !== undefined && asset.hasCaptions !== options.hasCaptions) {
        return false;
      }

      // Check if has transparency
      if (options.hasTransparency !== undefined && asset.hasTransparency !== options.hasTransparency) {
        return false;
      }

      // If all checks pass, include the asset
      return true;
    });
  }

  /**
   * Filter audio assets based on audio-specific filter options
   * @param assets The audio assets to filter
   * @param options The audio filter options
   * @returns Filtered audio assets
   */
  private filterAudioAssets(assets: AudioAsset[], options: AudioFilterOptions): AudioAsset[] {
    // First apply base filtering
    const baseFiltered = this.filterAssets(assets, options) as AudioAsset[];

    // Then apply audio-specific filtering
    return baseFiltered.filter(asset => {
      // Check format
      if (options.format && options.format.length > 0 && !options.format.includes(asset.format)) {
        return false;
      }

      // Check duration (min/max)
      if (options.maxDuration !== undefined && asset.duration > options.maxDuration) {
        return false;
      }
      if (options.minDuration !== undefined && asset.duration < options.minDuration) {
        return false;
      }

      // Check bitrate
      if (options.maxBitrate !== undefined && asset.bitrate > options.maxBitrate) {
        return false;
      }
      if (options.minBitrate !== undefined && asset.bitrate < options.minBitrate) {
        return false;
      }

      // Check channels
      if (options.channels !== undefined && asset.channels !== options.channels) {
        return false;
      }

      // Check sample rate
      if (options.maxSampleRate !== undefined && asset.sampleRate && asset.sampleRate > options.maxSampleRate) {
        return false;
      }
      if (options.minSampleRate !== undefined && asset.sampleRate && asset.sampleRate < options.minSampleRate) {
        return false;
      }

      // Check if has transcript
      if (options.hasTranscript !== undefined && asset.hasTranscript !== options.hasTranscript) {
        return false;
      }

      // Check mood
      if (options.mood !== undefined && asset.mood !== options.mood) {
        return false;
      }

      // Check targetDuration with looping
      if (options.targetDuration !== undefined) {
        if (asset.duration <= 0) return false; // Cannot loop or match duration if asset duration is zero or negative

        if (options.allowLooping) {
          const maxLoops = options.maxLoops === undefined || options.maxLoops <= 0 ? Infinity : options.maxLoops;
          let foundMatch = false;
          for (let n = 1; n <= maxLoops; n++) {
            if (Math.abs(asset.duration * n - options.targetDuration) < 0.1) {
              foundMatch = true;
              break;
            }
            if (asset.duration * n > options.targetDuration + 0.1 && n > 1) { // Optimization: if current loop already exceeds target, no need to check further.
                break;
            }
          }
          if (!foundMatch) return false;
        } else {
          // Not allowing looping, direct duration match
          if (Math.abs(asset.duration - options.targetDuration) > 0.1) {
            return false;
          }
        }
      }

      // If all checks pass, include the asset
      return true;
    });
  }

  /**
   * Filter font assets based on font-specific filter options
   * @param assets The font assets to filter
   * @param options The font filter options
   * @returns Filtered font assets
   */
  private filterFontAssets(assets: FontAsset[], options: FontFilterOptions): FontAsset[] {
    // First apply base filtering
    const baseFiltered = this.filterAssets(assets, options) as FontAsset[];

    // Then apply font-specific filtering
    return baseFiltered.filter(asset => {
      // Check format
      if (options.format && options.format.length > 0 && !options.format.includes(asset.format)) {
        return false;
      }

      // Check family
      if (options.family !== undefined && asset.family !== options.family) {
        return false;
      }

      // Check weight
      if (options.weight !== undefined) {
        if (Array.isArray(options.weight)) {
          // Weight is a range [min, max]
          if (asset.weight < options.weight[0] || asset.weight > options.weight[1]) {
            return false;
          }
        } else {
          // Weight is a specific value
          if (asset.weight !== options.weight) {
            return false;
          }
        }
      }

      // Check style
      if (options.style && options.style.length > 0 && !options.style.includes(asset.style)) {
        return false;
      }

      // Check if is variable
      if (options.isVariable !== undefined && asset.isVariable !== options.isVariable) {
        return false;
      }

      // If all checks pass, include the asset
      return true;
    });
  }

  /**
   * Ensure the asset manager is initialized before performing operations
   * @throws Error if the asset manager is not initialized
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('AssetManager is not initialized. Call initialize() first.');
    }
  }
}
