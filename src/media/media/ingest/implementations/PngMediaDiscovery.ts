/**
 * PngMediaDiscovery
 *
 * PNG metadata discovery implementation using exifr.
 * This class extracts metadata from PNG files using the exifr library.
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import exifr from 'exifr';
import {
  MediaType,
  AspectRatio,
  ContentPurpose
} from '../../types';
import {
  ImageAsset,
  ImageFormat
} from '../../image';
import {
  MediaIngestOptions,
  MediaIngestResult,
  ImageMediaDiscovery
} from '../types';
import { BaseMediaDiscovery } from '../BaseMediaDiscovery';

/**
 * PNG metadata discovery implementation using exifr
 */
export class PngMediaDiscovery extends BaseMediaDiscovery<ImageAsset> implements ImageMediaDiscovery {
  /**
   * Get the unique identifier for this discovery implementation
   */
  public getId(): string {
    return 'png-media-discovery';
  }

  /**
   * Get the display name for this discovery implementation
   */
  public getName(): string {
    return 'PNG Media Discovery';
  }

  /**
   * Get the supported media type
   */
  public getSupportedMediaType(): MediaType {
    return MediaType.IMAGE;
  }

  /**
   * Get the priority of this discovery implementation (higher = more preferred)
   */
  public getPriority(): number {
    return 150; // Higher priority than ExifMediaDiscovery for PNG files
  }

  /**
   * Get the supported formats
   */
  public getSupportedFormats(): ImageFormat[] {
    return [ImageFormat.PNG];
  }

  /**
   * Check if this discovery implementation can handle the given file
   * @param filePath Path to the file
   */
  public async canHandle(filePath: string): Promise<boolean> {
    try {
      console.log(`PngMediaDiscovery.canHandle: Checking file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`PngMediaDiscovery.canHandle: File does not exist: ${filePath}`);
        return false;
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      console.log(`PngMediaDiscovery.canHandle: File extension: ${ext}`);

      if (ext !== '.png') {
        console.log(`PngMediaDiscovery.canHandle: Not a PNG file (by extension): ${filePath}`);
        return false;
      }

      // Verify PNG signature
      const isPng = this.isPngFile(filePath);
      console.log(`PngMediaDiscovery.canHandle: Is PNG file (by signature): ${isPng}`);

      return isPng;
    } catch (error) {
      console.error(`Error in PngMediaDiscovery.canHandle: ${error}`);
      return false;
    }
  }

  /**
   * Check if a file is a PNG file by verifying its signature
   * @param filePath Path to the file
   * @returns True if the file is a PNG file, false otherwise
   */
  private isPngFile(filePath: string): boolean {
    try {
      console.log(`PngMediaDiscovery.isPngFile: Checking PNG signature for file: ${filePath}`);

      // Verify PNG signature
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      // Log the header bytes for debugging
      console.log(`PngMediaDiscovery.isPngFile: File header bytes: ${buffer.toString('hex')}`);

      // Check PNG signature (89 50 4E 47 0D 0A 1A 0A)
      const isPng = buffer[0] === 0x89 &&
                    buffer[1] === 0x50 &&
                    buffer[2] === 0x4E &&
                    buffer[3] === 0x47 &&
                    buffer[4] === 0x0D &&
                    buffer[5] === 0x0A &&
                    buffer[6] === 0x1A &&
                    buffer[7] === 0x0A;

      console.log(`PngMediaDiscovery.isPngFile: Signature check result: ${isPng}`);

      return isPng;
    } catch (error) {
      console.error(`Error checking PNG signature: ${error}`);
      return false;
    }
  }

  /**
   * Discover metadata from the given file and create an asset object
   * @param filePath Path to the file
   * @param options Options for the discovery process
   */
  public async discoverMetadata(filePath: string, options: MediaIngestOptions): Promise<MediaIngestResult<ImageAsset>> {
    try {
      console.log(`PngMediaDiscovery: Discovering metadata for ${filePath}`);

      // Create base asset
      const baseAsset = this.createBaseAsset(filePath, options);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(filePath);

      // Calculate aspect ratio
      const aspectRatio = this.calculateAspectRatio(dimensions.width, dimensions.height);

      // Extract metadata using exifr
      let metadata: any = {};
      try {
        // Use exifr to extract PNG metadata
        metadata = await exifr.parse(filePath, { tiff: true, xmp: true, icc: true });
        console.log(`Extracted PNG metadata using exifr:`, metadata);
      } catch (error) {
        console.warn(`Error extracting PNG metadata with exifr: ${error}`);
        // Continue with basic metadata even if exifr fails
      }

      // Create image asset
      const imageAsset: ImageAsset = {
        ...baseAsset,
        format: ImageFormat.PNG,
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: aspectRatio,
        // Add metadata from exifr if available
        ...(metadata?.BitDepth && { bitDepth: metadata.BitDepth }),
        ...(metadata?.ColorType && { colorSpace: metadata.ColorType }),
        ...(metadata?.Compression && { compression: metadata.Compression }),
        ...(metadata?.Filter && { filter: metadata.Filter }),
        ...(metadata?.Interlace && { interlace: metadata.Interlace }),
        // Add any additional metadata
        metadata: metadata || undefined
      };

      return {
        success: true,
        asset: imageAsset
      };
    } catch (error) {
      console.error(`Error discovering PNG metadata: ${error}`);
      return {
        success: false,
        error: `Error discovering PNG metadata: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get image dimensions
   * @param filePath Path to the image file
   */
  public async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    try {
      // Verify it's a PNG file
      if (!this.isPngFile(filePath)) {
        throw new Error('Invalid PNG file format');
      }

      // Read PNG header and IHDR chunk to extract dimensions
      const buffer = Buffer.alloc(24); // Enough to read the header and IHDR chunk
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 24, 0);
      fs.closeSync(fd);

      // Extract width (bytes 16-19) and height (bytes 20-23), they're big-endian integers
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      console.log(`Extracted PNG dimensions: ${width}x${height}`);
      return { width, height };
    } catch (error) {
      console.error(`Error getting PNG dimensions: ${error}`);
      throw error;
    }
  }

  /**
   * Get image format
   * @param filePath Path to the image file
   */
  public async getImageFormat(filePath: string): Promise<ImageFormat> {
    return ImageFormat.PNG;
  }

  /**
   * Calculate aspect ratio from dimensions
   * @param width Image width
   * @param height Image height
   */
  public calculateAspectRatio(width: number, height: number): AspectRatio | string {
    // Calculate GCD for simplification
    const gcd = (a: number, b: number): number => {
      return b === 0 ? a : gcd(b, a % b);
    };

    const divisor = gcd(width, height);
    const simplifiedWidth = width / divisor;
    const simplifiedHeight = height / divisor;

    // Check for common aspect ratios
    if (Math.abs(width / height - 16 / 9) < 0.01) {
      return "16:9";
    } else if (Math.abs(width / height - 4 / 3) < 0.01) {
      return "4:3";
    } else if (Math.abs(width / height - 1) < 0.01) {
      return "1:1";
    } else if (Math.abs(width / height - 3 / 2) < 0.01) {
      return "3:2";
    } else if (Math.abs(width / height - 21 / 9) < 0.01) {
      return "21:9";
    }

    // Return custom aspect ratio
    return `${simplifiedWidth}:${simplifiedHeight}`;
  }

  /**
   * Check if image has responsive versions available
   * @param filePath Path to the image file
   */
  public async checkResponsiveVersions(filePath: string): Promise<{
    hasResponsiveVersions: boolean;
    responsiveVersions?: string[];
  }> {
    // Implementation for checking responsive versions
    // This is a placeholder - actual implementation would depend on your system
    return {
      hasResponsiveVersions: false
    };
  }
}
