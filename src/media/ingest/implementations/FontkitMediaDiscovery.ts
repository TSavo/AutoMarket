/**
 * FontkitMediaDiscovery
 *
 * Implements font metadata discovery using the Fontkit library.
 * This class provides functionality to extract metadata from font files
 * and generate preview images.
 */

import path from 'path';
import fs from 'fs';
import { BaseMediaDiscovery } from '../BaseMediaDiscovery';
import {
  MediaIngestOptions,
  MediaIngestResult,
  FontMediaDiscovery
} from '../types';
import {
  MediaType
} from '../../types';
import {
  FontAsset,
  FontFormat
} from '../../font';
import {
  DerivativeMediaHandler,
  DerivativeType
} from '../DerivativeMediaHandler';

// Lazy-loaded dependencies
// Using any type to avoid TypeScript errors
let fontkit: any;

/**
 * FontkitMediaDiscovery class
 * Implements the FontMediaDiscovery interface using Fontkit
 */
export class FontkitMediaDiscovery extends BaseMediaDiscovery<FontAsset> implements FontMediaDiscovery {
  // Flag to track whether dependencies have been checked
  private static dependenciesChecked = false;

  // Derivative media handler
  private derivativeHandler?: DerivativeMediaHandler;

  // Flag to track whether dependencies are available
  private static dependenciesAvailable = false;

  /**
   * Constructor
   * @param derivativeHandler Optional derivative media handler
   */
  constructor(derivativeHandler?: DerivativeMediaHandler) {
    super();

    // Check dependencies on first instantiation
    if (!FontkitMediaDiscovery.dependenciesChecked) {
      // We can't make the constructor async, so we just trigger the check
      // and store the promise for later use
      this.dependenciesPromise = FontkitMediaDiscovery.checkDependencies();
    }

    // Store derivative handler
    this.derivativeHandler = derivativeHandler;
  }

  // Promise that resolves when dependencies have been checked
  private dependenciesPromise: Promise<void> | undefined;

  /**
   * Set the derivative media handler
   * @param handler The derivative media handler to use
   */
  public setDerivativeHandler(handler: DerivativeMediaHandler): void {
    this.derivativeHandler = handler;
  }

  /**
   * Check if required dependencies are installed
   */
  private static async checkDependencies(): Promise<void> {
    try {
      // Use a more TypeScript-friendly approach to dynamic imports
      // Using Function constructor to prevent TypeScript from trying to resolve the module
      // This is a workaround for modules without type definitions
      fontkit = await new Function('return import("fontkit")')()
        .then((module: any) => module.default || module)
        .catch((err: Error) => {
          console.error('Error importing fontkit:', err);
          throw err;
        });

      // Set flags to true
      FontkitMediaDiscovery.dependenciesChecked = true;
      FontkitMediaDiscovery.dependenciesAvailable = true;

      console.log('✅ FontkitMediaDiscovery: Fontkit dependency is installed');
    } catch {
      console.warn('⚠️ FontkitMediaDiscovery: Missing dependencies. Some features may not work correctly.');
      console.warn('   Run "npm install fontkit" to install the required dependencies.');

      // Set checked flag to true to avoid checking again, but available to false
      FontkitMediaDiscovery.dependenciesChecked = true;
      FontkitMediaDiscovery.dependenciesAvailable = false;
    }
  }

  /**
   * Get the unique identifier for this discovery implementation
   */
  public getId(): string {
    return 'fontkit-font-discovery';
  }

  /**
   * Get the display name for this discovery implementation
   */
  public getName(): string {
    return 'Fontkit Font Discovery';
  }

  /**
   * Get the media type this discovery implementation supports
   */
  public getSupportedMediaType(): MediaType {
    return MediaType.FONT;
  }

  /**
   * Get the priority of this discovery implementation
   */
  public getPriority(): number {
    return 100;
  }

  /**
   * Check if this discovery implementation can handle the given file
   * @param filePath Path to the file
   */
  public async canHandle(filePath: string): Promise<boolean> {
    // Check if dependencies are available
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      return false;
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    return ['.ttf', '.otf', '.woff', '.woff2'].includes(ext);
  }

  /**
   * Get supported font formats
   */
  public getSupportedFormats(): FontFormat[] {
    return [
      FontFormat.TTF,
      FontFormat.OTF,
      FontFormat.WOFF,
      FontFormat.WOFF2
    ];
  }

  /**
   * Get font format
   * @param filePath Path to the font file
   */
  public async getFontFormat(filePath: string): Promise<FontFormat> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.ttf':
        return FontFormat.TTF;
      case '.otf':
        return FontFormat.OTF;
      case '.woff':
        return FontFormat.WOFF;
      case '.woff2':
        return FontFormat.WOFF2;
      default:
        throw new Error(`Unsupported font format: ${ext}`);
    }
  }

  /**
   * Get font family name
   * @param filePath Path to the font file
   */
  public async getFontFamily(filePath: string): Promise<string> {
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      throw new Error('FontkitMediaDiscovery: Dependencies not available');
    }

    try {
      const font = fontkit.openSync(filePath);
      return font.familyName || 'Unknown';
    } catch (error) {
      throw new Error(`Failed to get font family name: ${(error as Error).message}`);
    }
  }

  /**
   * Get font weight
   * @param filePath Path to the font file
   */
  public async getFontWeight(filePath: string): Promise<number> {
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      throw new Error('FontkitMediaDiscovery: Dependencies not available');
    }

    try {
      const font = fontkit.openSync(filePath);

      // Parse weight from font name or use fontkit weight
      const weightMap: Record<string, number> = {
        thin: 100,
        extralight: 200,
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        heavy: 900,
        black: 900
      };

      const fontNameLower = font.fullName?.toLowerCase() || '';

      for (const [name, weight] of Object.entries(weightMap)) {
        if (fontNameLower.includes(name)) {
          return weight;
        }
      }

      // If font has a weight property, use that
      if (font.weight) {
        return font.weight;
      }

      // Default to regular weight
      return 400;
    } catch (error) {
      throw new Error(`Failed to get font weight: ${(error as Error).message}`);
    }
  }

  /**
   * Get font style
   * @param filePath Path to the font file
   */
  public async getFontStyle(filePath: string): Promise<'normal' | 'italic' | 'oblique'> {
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      throw new Error('FontkitMediaDiscovery: Dependencies not available');
    }

    try {
      const font = fontkit.openSync(filePath);

      // Check if font name contains italic or oblique
      const fontNameLower = font.fullName?.toLowerCase() || '';

      if (fontNameLower.includes('italic')) {
        return 'italic';
      } else if (fontNameLower.includes('oblique')) {
        return 'oblique';
      }

      // If font has a style property, use that
      if (font.italicAngle && font.italicAngle !== 0) {
        return 'italic';
      }

      return 'normal';
    } catch (error) {
      throw new Error(`Failed to get font style: ${(error as Error).message}`);
    }
  }

  /**
   * Check if the font is a variable font
   * @param filePath Path to the font file
   */
  public async isVariableFont(filePath: string): Promise<boolean> {
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      throw new Error('FontkitMediaDiscovery: Dependencies not available');
    }

    try {
      const font = fontkit.openSync(filePath);

      // Check for variable font feature
      return font.variationAxes !== undefined &&
        Object.keys(font.variationAxes || {}).length > 0;
    } catch (error) {
      throw new Error(`Failed to check if font is variable: ${(error as Error).message}`);
    }
  }

  /**
   * Get unicode range supported by the font
   * @param filePath Path to the font file
   */
  public async getUnicodeRange(filePath: string): Promise<string> {
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      throw new Error('FontkitMediaDiscovery: Dependencies not available');
    }

    try {
      const font = fontkit.openSync(filePath);

      // Get unicode ranges
      if (!font.characterSet) {
        return 'Unknown';
      }

      // Extract a few key unicode ranges
      const ranges: string[] = [];

      if (font.characterSet.includes(0x41)) {
        ranges.push('Basic Latin');
      }

      if (font.characterSet.includes(0xA0)) {
        ranges.push('Latin-1 Supplement');
      }

      if (font.characterSet.includes(0x370)) {
        ranges.push('Greek');
      }

      if (font.characterSet.includes(0x400)) {
        ranges.push('Cyrillic');
      }

      if (ranges.length === 0) {
        return 'Custom';
      }

      return ranges.join(', ');
    } catch (error) {
      throw new Error(`Failed to get unicode range: ${(error as Error).message}`);
    }
  }

  /**
   * Generate or find a preview image for the font
   * @param filePath Path to the font file
   */
  public async generatePreview(filePath: string): Promise<{
    success: boolean;
    previewImagePath?: string;
  }> {
    // Check if dependencies are available
    if (!FontkitMediaDiscovery.dependenciesAvailable) {
      return {
        success: false
      };
    }

    try {
      // Get preview path
      const previewPath = this.getPreviewPath(filePath);

      // Check if preview already exists
      if (fs.existsSync(previewPath)) {
        return {
          success: true,
          previewImagePath: previewPath
        };
      }

      // Open the font
      const font = fontkit.openSync(filePath);

      // Get font family
      const fontFamily = font.familyName || path.basename(filePath, path.extname(filePath));

      // Generate SVG preview
      const svgPreview = this.generateSVGPreview(font, fontFamily);

      // Ensure the directory exists
      const previewDir = path.dirname(previewPath);
      fs.mkdirSync(previewDir, { recursive: true });

      // Write the SVG file
      fs.writeFileSync(previewPath, svgPreview);

      return {
        success: true,
        previewImagePath: previewPath
      };
    } catch (error) {
      console.error(`Error generating font preview: ${(error as Error).message}`);
      return {
        success: false
      };
    }
  }

  /**
   * Discover metadata from the given file and create an asset object
   * @param filePath Path to the file
   * @param options Options for the discovery process
   */
  public async discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<FontAsset>> {
    try {
      // Check if this discovery can handle the file
      const canHandleFile = await this.canHandle(filePath);
      if (!canHandleFile) {
        return {
          success: false,
          error: `FontkitMediaDiscovery cannot handle file: ${filePath}`
        };
      }

      // Create base asset
      const baseAsset = this.createBaseAsset(filePath, options);

      // Get font format
      const fontFormat = await this.getFontFormat(filePath);

      // Create font asset
      const fontAsset: FontAsset = {
        ...baseAsset,
        type: MediaType.FONT,
        format: fontFormat,
        family: 'Unknown', // Will be updated below if possible
        weight: 400, // Will be updated below if possible
        style: 'normal', // Will be updated below if possible
        isVariable: false, // Will be updated below if possible
        unicodeRange: 'Unknown', // Will be updated below if possible
        previewImagePath: undefined // Will be updated below if possible
      };

      // Try to extract additional metadata if dependencies are available
      if (FontkitMediaDiscovery.dependenciesAvailable) {
        try {
          // Get font information
          const font = fontkit.openSync(filePath);

          // Update font asset with metadata
          fontAsset.family = font.familyName || fontAsset.family;
          fontAsset.style = await this.getFontStyle(filePath);
          fontAsset.weight = await this.getFontWeight(filePath);
          fontAsset.isVariable = await this.isVariableFont(filePath);
          fontAsset.unicodeRange = await this.getUnicodeRange(filePath);

          // If extractTags is enabled, add tags based on metadata
          if (options.extractTags) {
            // Add tag for font family
            fontAsset.tags.push(`family:${fontAsset.family}`);

            // Add tag for font weight
            fontAsset.tags.push(`weight:${fontAsset.weight}`);

            // Add tag for font style
            fontAsset.tags.push(`style:${fontAsset.style}`);

            // Add tag for variable font
            if (fontAsset.isVariable) {
              fontAsset.tags.push('variable');
            }
          }

          // Generate preview if derivative handler is available
          if (this.derivativeHandler) {
            // Generate and register preview
            const previewResult = await this.generateAndRegisterPreview(filePath, fontAsset.id, fontAsset.family);

            if (previewResult.success && previewResult.previewImagePath) {
              fontAsset.previewImagePath = previewResult.previewImagePath;
            }
          } else {
            // Just generate preview without registering
            const previewResult = await this.generatePreview(filePath);

            if (previewResult.success && previewResult.previewImagePath) {
              fontAsset.previewImagePath = previewResult.previewImagePath;
            }
          }
        } catch (error) {
          // Log the error but continue
          console.warn(`Warning: Could not extract detailed font metadata: ${(error as Error).message}`);
        }
      }

      return {
        success: true,
        asset: fontAsset
      };
    } catch (error) {
      return {
        success: false,
        error: `Error discovering font metadata: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get the path where the preview image will be stored
   * @param filePath Path to the font file
   * @returns Path for the preview image
   */
  private getPreviewPath(filePath: string): string {
    const fontDir = path.dirname(filePath);
    const fontName = path.basename(filePath, path.extname(filePath));
    const previewDir = path.join(fontDir, 'previews');
    return path.join(previewDir, `${fontName}_preview.svg`);
  }

  /**
   * Generate and register a preview image for a font
   * @param filePath Path to the font file
   * @param sourceAssetId ID of the source asset
   * @param fontFamily Font family name
   * @returns Result of the preview generation
   */
  private async generateAndRegisterPreview(
    filePath: string,
    sourceAssetId: string,
    fontFamily: string
  ): Promise<{
    success: boolean;
    previewImagePath?: string;
    derivativeId?: string;
  }> {
    if (!this.derivativeHandler) {
      throw new Error('Derivative handler not available');
    }

    try {
      // Generate preview
      const previewResult = await this.generatePreview(filePath);

      if (!previewResult.success || !previewResult.previewImagePath) {
        return {
          success: false
        };
      }

      // Register as derivative
      const result = await this.derivativeHandler.registerDerivative({
        path: previewResult.previewImagePath,
        sourceAssetId,
        derivativeType: DerivativeType.FONT_SAMPLE,
        title: `${fontFamily} Preview`,
        description: `Preview of ${fontFamily} font`,
        additionalTags: ['font-preview', `font:${fontFamily}`]
      });

      if (!result.success) {
        return {
          success: false,
          previewImagePath: previewResult.previewImagePath
        };
      }

      // Update source asset with derivative link
      await this.derivativeHandler.updateSourceAssetDerivativeLinks(
        sourceAssetId,
        [result.derivativeId as string]
      );

      return {
        success: true,
        previewImagePath: previewResult.previewImagePath,
        derivativeId: result.derivativeId
      };
    } catch (error) {
      console.error(`Error generating and registering font preview: ${(error as Error).message}`);
      return {
        success: false
      };
    }
  }

  /**
   * Generate a simple SVG preview of a font
   * @param font Font object from fontkit
   * @param fontFamily Font family name
   * @returns SVG string
   */
  private generateSVGPreview(font: any, fontFamily: string): string {
    // Create a simple SVG preview without using canvas
    // This is a basic preview that shows font information

    // Get font style
    let fontStyle = 'Regular';
    if (font.weight > 600) {
      fontStyle = 'Bold';
    } else if (font.weight < 400) {
      fontStyle = 'Light';
    }

    if (font.italicAngle !== 0) {
      fontStyle += ' Italic';
    }

    // Create a simple SVG with font information
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
      <rect width="800" height="400" fill="#f8f9fa" />
      <text x="50" y="80" font-family="Arial" font-size="24" font-weight="bold" fill="#333">Font: ${fontFamily}</text>
      <text x="50" y="120" font-family="Arial" font-size="18" fill="#555">Style: ${fontStyle}</text>
      <text x="50" y="160" font-family="Arial" font-size="18" fill="#555">Weight: ${font.weight || 'Unknown'}</text>
      <text x="50" y="200" font-family="Arial" font-size="18" fill="#555">Variable Font: ${font.variableAxes ? 'Yes' : 'No'}</text>
      <text x="50" y="240" font-family="Arial" font-size="18" fill="#555">Format: ${font.type || 'Unknown'}</text>
      <text x="50" y="300" font-family="Arial" font-size="14" fill="#777">Note: This is a simplified preview. Font rendering requires browser support.</text>
    </svg>`;
  }
}
