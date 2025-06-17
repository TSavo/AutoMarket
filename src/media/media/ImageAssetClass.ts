/**
 * ImageAssetClass
 *
 * Class for image assets with image-specific functionality.
 * This class provides methods for managing image properties and tags.
 */

import { BaseAssetClass } from './BaseAssetClass';
import { BaseAsset, MediaType, AspectRatio, ContentPurpose } from './types';
import { ImageAsset, ImageFormat } from './image';
import { calculateAspectRatio, getAspectRatioString } from './utils/AspectRatioUtils';

/**
 * Class for image assets
 */
export class ImageAssetClass extends BaseAssetClass implements ImageAsset {
  type: MediaType.IMAGE;
  format: ImageFormat;
  width: number;
  height: number;
  aspectRatio: AspectRatio | string;
  alt?: string;
  optimized: boolean;
  hasResponsiveVersions: boolean;
  responsiveVersions?: string[];
  colorSpace?: string;
  dpi?: number;

  /**
   * Create a new ImageAssetClass
   * @param asset The asset data to initialize with
   */
  constructor(asset: ImageAsset) {
    super(asset);

    this.type = MediaType.IMAGE;
    this.format = asset.format;
    this.width = asset.width;
    this.height = asset.height;
    this.aspectRatio = asset.aspectRatio;
    this.alt = asset.alt;
    this.optimized = asset.optimized;
    this.hasResponsiveVersions = asset.hasResponsiveVersions;
    this.responsiveVersions = asset.responsiveVersions;
    this.colorSpace = asset.colorSpace;
    this.dpi = asset.dpi;
  }

  /**
   * Set the dimensions of the image
   * @param width Width in pixels
   * @param height Height in pixels
   */
  public setDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    this.width = width;
    this.height = height;

    // Add dimension tags
    this.addTagValue('width', width);
    this.addTagValue('height', height);

    // Calculate and set aspect ratio
    this.calculateAndSetAspectRatio(width, height);

    this.updateModifiedDate();
  }

  /**
   * Calculate and set the aspect ratio based on dimensions
   * @param width Width in pixels
   * @param height Height in pixels
   */
  private calculateAndSetAspectRatio(width: number, height: number): void {
    // Use the common utility function to calculate aspect ratio
    const aspectRatio = calculateAspectRatio(width, height, 'Image:');

    // Set the aspect ratio property
    this.aspectRatio = aspectRatio;

    // Add the aspect ratio tag
    const aspectRatioString = getAspectRatioString(aspectRatio);
    this.addTagValue('aspectRatio', aspectRatioString);
  }

  // getGCD method removed - now using the common utility in AspectRatioUtils

  /**
   * Set the format of the image
   * @param format Image format
   */
  public setFormat(format: ImageFormat): void {
    this.format = format;
    this.addTagValue('format', format);
    this.updateModifiedDate();
  }

  /**
   * Set the alternative text for the image
   * @param alt Alternative text
   */
  public setAlt(alt: string): void {
    if (!alt || alt.trim() === '') {
      this.alt = undefined;
      return;
    }

    this.alt = alt.trim();
    this.addTagValue('alt', this.alt);
    this.updateModifiedDate();
  }

  /**
   * Set whether the image is optimized
   * @param optimized Whether the image is optimized
   */
  public setOptimized(optimized: boolean): void {
    this.optimized = optimized;
    this.addTagValue('optimized', optimized);
    this.updateModifiedDate();
  }

  /**
   * Set the color space of the image
   * @param colorSpace Color space (e.g., 'sRGB', 'Adobe RGB')
   */
  public setColorSpace(colorSpace: string): void {
    if (!colorSpace || colorSpace.trim() === '') {
      this.colorSpace = undefined;
      return;
    }

    this.colorSpace = colorSpace.trim();
    this.addTagValue('colorSpace', this.colorSpace);
    this.updateModifiedDate();
  }

  /**
   * Set the DPI (dots per inch) of the image
   * @param dpi DPI value
   */
  public setDPI(dpi: number): void {
    if (dpi <= 0) {
      this.dpi = undefined;
      return;
    }

    this.dpi = dpi;
    this.addTagValue('dpi', dpi);
    this.updateModifiedDate();
  }

  /**
   * Add a responsive version of the image
   * @param path Path to the responsive version
   * @returns True if the version was added, false if it already existed
   */
  public addResponsiveVersion(path: string): boolean {
    if (!path || path.trim() === '') {
      return false;
    }

    const trimmedPath = path.trim();

    // Initialize array if it doesn't exist
    if (!this.responsiveVersions) {
      this.responsiveVersions = [];
    }

    // Check if version already exists
    if (this.responsiveVersions.includes(trimmedPath)) {
      return false;
    }

    // Add the version
    this.responsiveVersions.push(trimmedPath);
    this.hasResponsiveVersions = true;

    // Add tag
    this.addTagValue('hasResponsiveVersions', true);

    this.updateModifiedDate();

    return true;
  }

  /**
   * Remove a responsive version of the image
   * @param path Path to the responsive version to remove
   * @returns True if the version was removed, false if it didn't exist
   */
  public removeResponsiveVersion(path: string): boolean {
    if (!this.responsiveVersions || !path || path.trim() === '') {
      return false;
    }

    const trimmedPath = path.trim();
    const initialLength = this.responsiveVersions.length;

    // Remove the version
    this.responsiveVersions = this.responsiveVersions.filter(p => p !== trimmedPath);

    // Update hasResponsiveVersions flag
    this.hasResponsiveVersions = this.responsiveVersions.length > 0;

    // Update tag
    this.addTagValue('hasResponsiveVersions', this.hasResponsiveVersions);

    // Check if a version was removed
    if (this.responsiveVersions.length !== initialLength) {
      this.updateModifiedDate();
      return true;
    }

    return false;
  }

  /**
   * Add an image-specific tag
   * @param tag The tag to add
   * @returns True if the tag was added, false if it already existed
   */
  public addImageTag(tag: string): boolean {
    // Add a prefix to indicate it's an image-specific tag
    return this.addTag(`image:${tag}`);
  }

  /**
   * Convert the class instance to a plain object
   * @returns Plain object representation of the asset
   */
  public toObject(): ImageAsset {
    const baseObject = super.toObject();

    return {
      ...baseObject,
      type: MediaType.IMAGE,
      format: this.format,
      width: this.width,
      height: this.height,
      aspectRatio: this.aspectRatio,
      alt: this.alt,
      optimized: this.optimized,
      hasResponsiveVersions: this.hasResponsiveVersions,
      responsiveVersions: this.responsiveVersions,
      colorSpace: this.colorSpace,
      dpi: this.dpi
    };
  }
}
