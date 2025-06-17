/**
 * Image Generation Module
 *
 * This module provides a function to generate an image from a prompt using Replicate API.
 * It includes the Sharp post-processing step to ensure high-quality images.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import sharp from 'sharp';
import dotenv from 'dotenv';
import Replicate from 'replicate';

// Load environment variables
dotenv.config();

// Check for required API key
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('Error: REPLICATE_API_TOKEN environment variable is not set');
  process.exit(1);
}

// Default aspect ratio options
export const aspectRatioOptions = {
  // Use downtown-overview.png resolution as default (16:9 aspect ratio)
  default: { width: 2752, height: 1536 },
  // Portrait (2:3)
  portrait: { width: 1024, height: 1536 },
  // Landscape (3:2)
  landscape: { width: 1536, height: 1024 },
  // Square (1:1)
  square: { width: 1536, height: 1536 },
  // Widescreen (16:9)
  widescreen: { width: 2752, height: 1536 }
};

// Interface for image generation options
export interface ImageGenerationOptions {
  width?: number;
  height?: number;
  aspectRatio?: string;
  negative_prompt?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  raw?: boolean;
  format?: 'png' | 'jpeg' | 'jpg' | 'webp';
  quality?: number;
  force?: boolean;
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    background?: { r: number; g: number; b: number; alpha: number };
  };
}

/**
 * Generate an image using Replicate API
 */
async function generateImageWithReplicate(prompt: string, options: ImageGenerationOptions = {}): Promise<Buffer> {
  const {
    width = 2752,
    height = 1536,
    negative_prompt = '',
    num_inference_steps = 30,
    guidance_scale = 7.5,
    raw = true, // Default to raw=true for more natural-looking images
  } = options;

  console.log(`Generating image with prompt: "${prompt}"...`);

  try {
    // Initialize the Replicate client - exactly as in the example
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Prepare the model ID
    const modelId = 'black-forest-labs/flux-1.1-pro-ultra';

    // Create the input object - keep it simple but ensure correct aspect ratio
    const input = {
      prompt,
      negative_prompt,
      width,
      height,
      num_inference_steps,
      guidance_scale,
      raw,
      aspect_ratio: "16:9", // Explicitly set aspect ratio to 16:9
    };

    // Run the model using the Replicate client - exactly as in the example
    const output = await replicate.run(modelId, { input });

    // Create a temporary file to store the output
    const tempFilePath = path.join(process.cwd(), 'temp_image.png');

    // Write the output to a file - exactly as in the example
    await fs.promises.writeFile(tempFilePath, output as Buffer);

    // Read the file back as a buffer
    const imageBuffer = await fs.promises.readFile(tempFilePath);

    // Clean up the temporary file
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (error) {
      console.warn('Failed to delete temporary file:', error);
    }

    return imageBuffer;
  } catch (error: any) {
    console.error('Error generating image with Replicate:', error.message);
    console.error('Problematic prompt:', prompt);
    
    // If it's an NSFW error, provide more context
    if (error.message && error.message.includes('NSFW')) {
      console.error('🚫 NSFW content detected in prompt. Consider sanitizing:');
      console.error('  - Remove terms like "death", "execution", "kill", etc.');
      console.error('  - Replace with neutral terms like "processing", "termination protocols", "cessation"');
      console.error('  - Focus on technical/industrial elements rather than biological consequences');
    }
    
    throw error;
  }
}

/**
 * Process an image buffer with Sharp and save it to disk
 */
async function processAndSaveImage(
  imageBuffer: Buffer,
  outputPath: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 100,
    resize = null,
  } = options;

  try {
    console.log(`Processing image with Sharp...`);

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.promises.mkdir(dir, { recursive: true });

    // Create Sharp instance
    let sharpInstance = sharp(imageBuffer);

    // Apply resize if specified
    if (resize) {
      sharpInstance = sharpInstance.resize(resize.width, resize.height, {
        fit: resize.fit || 'contain',
        background: resize.background || { r: 255, g: 255, b: 255, alpha: 1 }
      });
    }

    // Apply format-specific options
    if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Make sure the output path has the correct extension
    const fileExt = path.extname(outputPath).toLowerCase().slice(1);
    if (fileExt !== format) {
      outputPath = outputPath.replace(/\.[^/.]+$/, '') + '.' + format;
    }

    // Save the image to disk
    await sharpInstance.toFile(outputPath);
    console.log(`Image saved successfully to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error('Error processing image with Sharp:', error);
    throw error;
  }
}

/**
 * Generate an image from a prompt and save it to disk
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  try {
    // Check if the image already exists and we're not forcing regeneration
    if (fs.existsSync(outputPath) && !options.force) {
      console.log(`Image already exists at ${outputPath}. Use force option to regenerate.`);
      return outputPath;
    }

    // Calculate dimensions based on aspect ratio if provided
    let dimensionOptions: { width: number; height: number } = {
      width: options.width || aspectRatioOptions.default.width,
      height: options.height || aspectRatioOptions.default.height
    };

    if (options.aspectRatio) {
      // Parse common aspect ratio formats
      if (options.aspectRatio === '16:9' || options.aspectRatio === '16/9') {
        dimensionOptions = aspectRatioOptions.widescreen;
      } else if (options.aspectRatio === '2:3' || options.aspectRatio === '2/3') {
        dimensionOptions = aspectRatioOptions.portrait;
      } else if (options.aspectRatio === '3:2' || options.aspectRatio === '3/2') {
        dimensionOptions = aspectRatioOptions.landscape;
      } else if (options.aspectRatio === '1:1' || options.aspectRatio === '1/1') {
        dimensionOptions = aspectRatioOptions.square;
      } else {
        // Try to parse custom aspect ratios like "4:3"
        const parts = options.aspectRatio.split(/[:\/]/);
        if (parts.length === 2) {
          const ratioWidth = parseFloat(parts[0]);
          const ratioHeight = parseFloat(parts[1]);
          if (!isNaN(ratioWidth) && !isNaN(ratioHeight) && ratioWidth > 0 && ratioHeight > 0) {
            // Use the default width and calculate height based on the ratio
            const baseWidth = 2752; // Use the downtown-overview.png width as base
            const calculatedHeight = Math.floor(baseWidth * (ratioHeight / ratioWidth));
            dimensionOptions = { width: baseWidth, height: calculatedHeight };
          }
        }
      }
    }

    // Generate the image
    const imageBuffer = await generateImageWithReplicate(prompt, {
      ...dimensionOptions,
      negative_prompt: options.negative_prompt,
      num_inference_steps: options.num_inference_steps,
      guidance_scale: options.guidance_scale,
      raw: options.raw !== undefined ? options.raw : true,
      // Always include the aspect ratio
      aspectRatio: options.aspectRatio || '16:9'
    });

    // Process and save the image
    const savedPath = await processAndSaveImage(imageBuffer, outputPath, {
      format: options.format || 'png',
      quality: options.quality || 100,
      resize: options.resize
    });

    console.log(`✅ Image generation complete! Saved to: ${savedPath}`);
    return savedPath;
  } catch (error) {
    console.error('❌ Failed to generate or save image:', error);
    throw error;
  }
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Parse command line arguments and run the generator
  console.log('This module is not meant to be run directly. Import it in your scripts instead.');
  process.exit(1);
}
