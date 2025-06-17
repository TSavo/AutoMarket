/**
 * ExifMediaDiscovery
 *
 * Image metadata discovery implementation using EXIF data.
 * This class extracts metadata from image files using EXIF data.
 */

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import {
  MediaType,
  AspectRatio
} from '../types';
import {
  ImageAsset,
  ImageFormat
} from '../image';
import {
  MediaIngestOptions,
  MediaIngestResult,
  ImageMediaDiscovery
} from './types';
import { BaseMediaDiscovery } from './BaseMediaDiscovery';

// Import exifr library
import exifr from 'exifr';

// Promisify exec
const execAsync = promisify(exec);

/**
 * Image metadata discovery implementation using EXIF data
 */
export class ExifMediaDiscovery extends BaseMediaDiscovery<ImageAsset> implements ImageMediaDiscovery {
  /**
   * Get the unique identifier for this discovery implementation
   */
  public getId(): string {
    return 'exif-image-discovery';
  }

  /**
   * Get the display name for this discovery implementation
   */
  public getName(): string {
    return 'EXIF Image Discovery';
  }

  /**
   * Get the media type this discovery implementation supports
   */
  public getSupportedMediaType(): MediaType {
    return MediaType.IMAGE;
  }

  /**
   * Get the priority of this discovery implementation (higher number = higher priority)
   */
  public getPriority(): number {
    return 100; // High priority as it's a reliable method
  }

  /**
   * Get supported image formats
   */
  public getSupportedFormats(): ImageFormat[] {
    return [
      ImageFormat.JPEG,
      ImageFormat.JPG,
      ImageFormat.PNG,
      ImageFormat.WEBP,
      ImageFormat.AVIF,
      ImageFormat.GIF
    ];
  }

  /**
   * Check if this discovery implementation can handle the given file
   * @param filePath Path to the file
   */
  public async canHandle(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();

    // Check by extension first as a quick test
    if (['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'].includes(ext)) {
      try {
        console.log(`ExifMediaDiscovery checking if it can handle file: ${filePath}`);
        // Try to get image dimensions as a verification
        await this.getImageDimensions(filePath);
        console.log(`ExifMediaDiscovery can handle file: ${filePath}`);
        return true;
      } catch (error) {
        // Not a valid image file or exif reading failed
        console.error(`ExifMediaDiscovery cannot handle file: ${filePath}`, error);
        return false;
      }
    }

    console.log(`ExifMediaDiscovery cannot handle file (unsupported extension): ${filePath}`);
    return false;
  }

  /**
   * Discover metadata from the given file and create an asset object
   * @param filePath Path to the file
   * @param options Options for the discovery process
   */
  public async discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<ImageAsset>> {
    try {
      // Create base asset
      const baseAsset = this.createBaseAsset(filePath, options);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(filePath);

      // Get image format
      const format = await this.getImageFormat(filePath);

      // Calculate aspect ratio
      const aspectRatio = this.calculateAspectRatio(dimensions.width, dimensions.height);

      // Check for responsive versions
      const responsiveInfo = await this.checkResponsiveVersions(filePath);

      // Create image asset
      const imageAsset: ImageAsset = {
        ...baseAsset,
        type: MediaType.IMAGE,
        format,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
        alt: options.defaultDescription || '',
        optimized: false, // We don't know if it's optimized yet
        hasResponsiveVersions: responsiveInfo.hasResponsiveVersions,
        responsiveVersions: responsiveInfo.responsiveVersions
      } as ImageAsset;

      // Extract tags if requested
      if (options.extractTags) {
        const extractedTags = this.extractTagsFromPath(filePath);
        imageAsset.tags = [...new Set([...imageAsset.tags, ...extractedTags])];

        // Try to extract tags from EXIF data
        try {
          const exifTags = await this.extractTagsFromExif(filePath);
          imageAsset.tags = [...new Set([...imageAsset.tags, ...exifTags])];
        } catch {
          // Ignore EXIF tag extraction errors
        }
      }

      return this.createSuccessResult(imageAsset);
    } catch (error) {
      return this.createErrorResult(`Error discovering image metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Get image dimensions
   * @param filePath Path to the image file
   */
  public async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    // Try to use exifr first
    try {
      console.log(`Trying to get dimensions for ${filePath} using exifr`);
      const metadata = await exifr.parse(filePath);

      if (metadata?.width && metadata?.height) {
        console.log(`Found dimensions using exifr: ${metadata.width}x${metadata.height}`);
        return {
          width: metadata.width,
          height: metadata.height
        };
      }
    } catch (error) {
      console.log(`Exifr failed to get dimensions: ${error instanceof Error ? error.message : String(error)}`);
      // Fall back to other methods
    }

    // Check file format based on extension
    const ext = path.extname(filePath).toLowerCase();
    console.log(`Checking file by extension: ${ext}`);

    // Try to use ImageMagick if available (which can handle most image formats)
    try {
      console.log('Attempting to get dimensions with ImageMagick identify command');
      const { stdout } = await execAsync(`identify -format "%wx%h" "${filePath}"`);
      const dimensions = stdout.trim().split('x');
      console.log(`ImageMagick found dimensions: ${stdout.trim()}`);

      return {
        width: parseInt(dimensions[0], 10),
        height: parseInt(dimensions[1], 10)
      };
    } catch (error) {
      console.log(`ImageMagick identify failed: ${error instanceof Error ? error.message : String(error)}`);
      // Continue to format-specific approaches below
    }

      if (ext === '.jpg' || ext === '.jpeg') {
        // Read JPEG dimensions synchronously from file
        const buffer = Buffer.alloc(10);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 10, 0);
        fs.closeSync(fd);

        // JPEG magic number check
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
          // This is a naive implementation and would need to be more robust in a real app
          return {
            width: 1920, // Placeholder
            height: 1080  // Placeholder
          };
        }
      } else if (ext === '.png') {
        // Simple PNG dimension reader
        try {
          console.log('Trying to read PNG dimensions directly from file header');
          // Read PNG header and IHDR chunk to extract dimensions
          const buffer = Buffer.alloc(24); // Enough to read the header and IHDR chunk
          const fd = fs.openSync(filePath, 'r');
          fs.readSync(fd, buffer, 0, 24, 0);
          fs.closeSync(fd);

          // Check PNG signature
          if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            // Extract width (bytes 16-19) and height (bytes 20-23), they're big-endian integers
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);

            console.log(`Extracted PNG dimensions: ${width}x${height}`);
            return { width, height };
          }
        } catch (error) {
          console.log(`Error reading PNG dimensions directly: ${error instanceof Error ? error.message : String(error)}`);
          // Return a default dimension as a last resort
          return {
            width: 1920, // Placeholder
            height: 1080  // Placeholder
          };
        }
      }

      throw new Error('Could not determine image dimensions');
    }

  /**
   * Get image format
   * @param filePath Path to the image file
   */
  public async getImageFormat(filePath: string): Promise<ImageFormat> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return ImageFormat.JPEG;
      case '.png':
        return ImageFormat.PNG;
      case '.webp':
        return ImageFormat.WEBP;
      case '.avif':
        return ImageFormat.AVIF;
      case '.gif':
        return ImageFormat.GIF;
      case '.svg':
        return ImageFormat.SVG;
      default:
        // Default to JPEG for unknown formats
        return ImageFormat.JPEG;
    }
  }

  /**
   * Calculate aspect ratio from dimensions
   * @param width Image width
   * @param height Image height
   */
  public calculateAspectRatio(width: number, height: number): AspectRatio | string {
    // Calculate GCD for width and height
    const gcd = this.getGCD(width, height);

    // Calculate simplified ratio
    const simplifiedWidth = width / gcd;
    const simplifiedHeight = height / gcd;

    // Check for common aspect ratios
    if (Math.abs(width / height - 16 / 9) < 0.01) {
      return AspectRatio.LANDSCAPE_WIDESCREEN;
    } else if (Math.abs(width / height - 4 / 3) < 0.01) {
      return AspectRatio.LANDSCAPE_STANDARD;
    } else if (Math.abs(width / height - 1) < 0.01) {
      return AspectRatio.SQUARE;
    } else if (Math.abs(width / height - 3 / 4) < 0.01) {
      return AspectRatio.PORTRAIT_STANDARD;
    } else if (Math.abs(width / height - 21 / 9) < 0.01) {
      return AspectRatio.ULTRAWIDE;
    } else if (Math.abs(width / height - 2.35) < 0.01) {
      return AspectRatio.CINEMA_SCOPE;
    } else if (Math.abs(width / height - 9 / 16) < 0.01) {
      return AspectRatio.PORTRAIT_MOBILE;
    } else {
      return `${simplifiedWidth}:${simplifiedHeight}`;
    }
  }

  /**
   * Check if image has responsive versions available
   * @param filePath Path to the image file
   */
  public async checkResponsiveVersions(filePath: string): Promise<{
    hasResponsiveVersions: boolean;
    responsiveVersions?: string[];
  }> {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const ext = path.extname(filePath);

    // Common responsive version suffixes
    const suffixes = ['-sm', '-md', '-lg', '-xl', '-2x', '-3x', '-mobile', '-tablet', '-desktop'];

    const responsiveVersions: string[] = [];

    // Check for each suffix
    for (const suffix of suffixes) {
      const responsiveFilePath = path.join(dir, baseName + suffix + ext);

      if (fs.existsSync(responsiveFilePath)) {
        responsiveVersions.push(this.getRelativePath(responsiveFilePath));
      }
    }

    return {
      hasResponsiveVersions: responsiveVersions.length > 0,
      responsiveVersions: responsiveVersions.length > 0 ? responsiveVersions : undefined
    };
  }

  /**
   * Extract tags from EXIF data
   * @param filePath Path to the image file
   */
  private async extractTagsFromExif(filePath: string): Promise<string[]> {
    const tags: string[] = [];

    try {
      // Use exifr to parse metadata from the file
      const metadata = await exifr.parse(filePath);

      if (metadata?.Keywords) {
        // IPTC Keywords is often an array of keywords
        if (Array.isArray(metadata.Keywords)) {
          tags.push(...metadata.Keywords);
        } else if (typeof metadata.Keywords === 'string') {
          tags.push(metadata.Keywords);
        }
      }

      if (metadata?.Caption) {
        // Try to extract keywords from caption
        const words = metadata.Caption.split(/[\s,;]+/);
        tags.push(...words.filter((w: string) => w.length > 3));
      }

      if (metadata?.Subject) {
        // Subject can be an array or string
        if (Array.isArray(metadata.Subject)) {
          tags.push(...metadata.Subject);
        } else if (typeof metadata.Subject === 'string') {
          tags.push(metadata.Subject);
        }
      }
    } catch (error) {
      // Log any errors but continue
      console.log(`Error extracting EXIF tags: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Filter out duplicates and non-string values
    return tags
      .filter(tag => typeof tag === 'string' && tag.length > 0)
      .map(tag => tag.trim())
      .filter((tag, i, arr) => arr.indexOf(tag) === i);
  }


  /**
   * Calculate greatest common divisor (GCD) of two numbers
   * @param a First number
   * @param b Second number
   */
  private getGCD(a: number, b: number): number {
    return b === 0 ? a : this.getGCD(b, a % b);
  }
}
