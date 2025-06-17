/**
 * FontAssetClass
 * 
 * Class for font assets with font-specific functionality.
 * This class provides methods for managing font properties and tags.
 */

import { BaseAssetClass } from './BaseAssetClass';
import { BaseAsset, MediaType, ContentPurpose } from './types';
import { FontAsset, FontFormat } from './font';

/**
 * Class for font assets
 */
export class FontAssetClass extends BaseAssetClass implements FontAsset {
  type: MediaType.FONT;
  format: FontFormat;
  family: string;
  weight: number;
  style: 'normal' | 'italic' | 'oblique';
  isVariable: boolean;
  unicodeRange?: string;
  previewImagePath?: string;

  /**
   * Create a new FontAssetClass
   * @param asset The asset data to initialize with
   */
  constructor(asset: FontAsset) {
    super(asset);
    
    this.type = MediaType.FONT;
    this.format = asset.format;
    this.family = asset.family;
    this.weight = asset.weight;
    this.style = asset.style;
    this.isVariable = asset.isVariable;
    this.unicodeRange = asset.unicodeRange;
    this.previewImagePath = asset.previewImagePath;
  }

  /**
   * Set the format of the font
   * @param format Font format
   */
  public setFormat(format: FontFormat): void {
    this.format = format;
    this.addTagValue('format', format);
    this.updateModifiedDate();
  }
  
  /**
   * Set the font family
   * @param family Font family name
   */
  public setFamily(family: string): void {
    if (!family || family.trim() === '') {
      return;
    }
    
    this.family = family.trim();
    this.addTagValue('family', this.family);
    this.updateModifiedDate();
  }
  
  /**
   * Set the font weight
   * @param weight Font weight (100-900)
   */
  public setWeight(weight: number): void {
    // Validate weight (must be between 100 and 900, and a multiple of 100)
    if (weight < 100 || weight > 900 || weight % 100 !== 0) {
      return;
    }
    
    this.weight = weight;
    this.addTagValue('weight', weight);
    this.updateModifiedDate();
  }
  
  /**
   * Set the font style
   * @param style Font style ('normal', 'italic', or 'oblique')
   */
  public setStyle(style: 'normal' | 'italic' | 'oblique'): void {
    this.style = style;
    this.addTagValue('style', style);
    this.updateModifiedDate();
  }
  
  /**
   * Set whether the font is variable
   * @param isVariable Whether the font is variable
   */
  public setIsVariable(isVariable: boolean): void {
    this.isVariable = isVariable;
    this.addTagValue('isVariable', isVariable);
    this.updateModifiedDate();
  }
  
  /**
   * Set the Unicode range of the font
   * @param unicodeRange Unicode range
   */
  public setUnicodeRange(unicodeRange: string): void {
    if (!unicodeRange || unicodeRange.trim() === '') {
      this.unicodeRange = undefined;
      return;
    }
    
    this.unicodeRange = unicodeRange.trim();
    this.addTagValue('unicodeRange', this.unicodeRange);
    this.updateModifiedDate();
  }
  
  /**
   * Set the preview image path
   * @param path Path to the preview image
   */
  public setPreviewImagePath(path: string): void {
    if (!path || path.trim() === '') {
      this.previewImagePath = undefined;
      return;
    }
    
    this.previewImagePath = path.trim();
    this.addTagValue('previewImage', this.previewImagePath);
    this.updateModifiedDate();
  }
  
  /**
   * Add a font-specific tag
   * @param tag The tag to add
   * @returns True if the tag was added, false if it already existed
   */
  public addFontTag(tag: string): boolean {
    // Add a prefix to indicate it's a font-specific tag
    return this.addTag(`font:${tag}`);
  }
  
  /**
   * Convert the class instance to a plain object
   * @returns Plain object representation of the asset
   */
  public toObject(): FontAsset {
    const baseObject = super.toObject();
    
    return {
      ...baseObject,
      type: MediaType.FONT,
      format: this.format,
      family: this.family,
      weight: this.weight,
      style: this.style,
      isVariable: this.isVariable,
      unicodeRange: this.unicodeRange,
      previewImagePath: this.previewImagePath
    };
  }
}
