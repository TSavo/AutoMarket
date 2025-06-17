/**
 * Image processing functionality for blog posts
 */

import fs from 'fs';
import path from 'path';
import { generateImage } from './generate-image';
import { animateImage, getAnimationPath, getAnimationWebPath } from './animate-image';
import { HORIZON_CITY_PATH, IMAGES_PATH, VIDEOS_PATH } from './config';
import type { BlogImageData, ProcessingOptions } from './types';

/**
 * Process the main image for a blog post
 */
export async function processMainImage(
  slug: string,
  images: BlogImageData,
  options: ProcessingOptions = {}
): Promise<Partial<BlogImageData> | null> {
  const imageSrc = images.src;
  const generationPrompt = images.generationPrompt;
  const negativePrompt = images.negativePrompt;
  const animationPrompt = images.animationPrompt;
  
  console.log(`Processing main image: ${imageSrc}`);

  let updatedImages: Partial<BlogImageData> | null = null;

  if (imageSrc) {
    // Get the full image path
    const fullImagePath = path.join(HORIZON_CITY_PATH, 'public', imageSrc);

    // Generate the image if it doesn't exist and we have a generation prompt
    if ((!fs.existsSync(fullImagePath) || options.force) && generationPrompt) {
      console.log(`Main image not found or force regeneration requested, generating: ${fullImagePath}`);

      try {
        // Generate the image
        await generateImage(
          generationPrompt,
          fullImagePath,
          {
            negative_prompt: negativePrompt,
            aspectRatio: '16:9', // Default aspect ratio for blog images
            force: options.force
          }
        );
      } catch (error) {
        console.error(`Error generating main image:`, error);
      }
    } else if (!fs.existsSync(fullImagePath) && !generationPrompt) {
      console.error(`❌ Main image not found and no generation prompt provided: ${fullImagePath}`);
    } else {
      console.log(`Main image exists: ${fullImagePath}`);
    }

    // Generate animation if needed
    if (animationPrompt) {
      const animationResult = await processImageAnimation(fullImagePath, imageSrc, animationPrompt, options);
      if (animationResult) {
        updatedImages = { ...images, ...animationResult };
      }
    }
  } else if (generationPrompt) {
    // Generate a new image path
    const imageFilename = `${slug}.png`;
    const imagePath = path.join(IMAGES_PATH, imageFilename);
    const webImagePath = `/images/blog/${imageFilename}`;

    try {
      // Generate the image
      await generateImage(
        generationPrompt,
        imagePath,
        {
          negative_prompt: negativePrompt || getDefaultNegativePrompt(),
          aspectRatio: '16:9', // Default aspect ratio for blog images
          force: options.force
        }
      );

      // Update the image path in the data
      updatedImages = { ...images, src: webImagePath };

      // Generate animation if needed
      if (animationPrompt) {
        const animationResult = await processImageAnimation(imagePath, webImagePath, animationPrompt, options);
        if (animationResult) {
          updatedImages = { ...updatedImages, ...animationResult };
        }
      }
    } catch (error) {
      console.error(`Error generating main image:`, error);
    }
  }

  return updatedImages;
}

/**
 * Process blog images array
 */
export async function processBlogImages(
  slug: string,
  blogImages: BlogImageData[],
  options: ProcessingOptions = {}
): Promise<BlogImageData[]> {
  console.log(`Processing ${blogImages.length} blog images...`);

  const updatedBlogImages: BlogImageData[] = [];

  for (let i = 0; i < blogImages.length; i++) {
    const img = { ...blogImages[i] }; // Create a copy to avoid modifying the original
    console.log(`Processing blog image ${i + 1}/${blogImages.length}: ${img.src || 'New image'}`);

    const generationPrompt = img.generationPrompt;
    const negativePrompt = img.negativePrompt;
    const animationPrompt = img.animationPrompt;

    if (img.src) {
      // Get the full image path
      const fullImagePath = path.join(HORIZON_CITY_PATH, 'public', img.src);

      // Generate the image if it doesn't exist and we have a generation prompt
      if ((!fs.existsSync(fullImagePath) || options.force) && generationPrompt) {
        console.log(`Blog image not found or force regeneration requested, generating: ${fullImagePath}`);

        try {
          // Generate the image
          await generateImage(
            generationPrompt,
            fullImagePath,
            {
              negative_prompt: negativePrompt || getDefaultNegativePrompt(),
              aspectRatio: img.aspectRatio || '16:9', // Use specified aspect ratio or default
              force: options.force
            }
          );
        } catch (error) {
          console.error(`Error generating blog image "${img.src}":`, error);
          console.error(`Failed prompt: "${generationPrompt}"`);
        }
      } else if (!fs.existsSync(fullImagePath) && !generationPrompt) {
        console.error(`❌ Blog image not found and no generation prompt provided: ${fullImagePath}`);
      } else {
        console.log(`Blog image exists: ${fullImagePath}`);
      }

      // Generate animation if needed
      if (animationPrompt) {
        const animationResult = await processImageAnimation(fullImagePath, img.src, animationPrompt, options);
        if (animationResult) {
          Object.assign(img, animationResult);
        }
      }
    } else if (generationPrompt) {
      // Generate a new image path
      const imageFilename = `${slug}-image-${i + 1}.png`;
      const imagePath = path.join(IMAGES_PATH, imageFilename);
      const webImagePath = `/images/blog/${imageFilename}`;

      try {
        // Generate the image
        await generateImage(
          generationPrompt,
          imagePath,
          {
            negative_prompt: negativePrompt || getDefaultNegativePrompt(),
            aspectRatio: img.aspectRatio || '16:9', // Use specified aspect ratio or default
            force: options.force
          }
        );

        // Update the image path in the data
        img.src = webImagePath;

        // Generate animation if needed
        if (animationPrompt) {
          const animationResult = await processImageAnimation(imagePath, webImagePath, animationPrompt, options);
          if (animationResult) {
            Object.assign(img, animationResult);
          }
        }
      } catch (error) {
        console.error(`Error generating blog image "${webImagePath}":`, error);
        console.error(`Failed prompt: "${generationPrompt}"`);
      }
    }

    updatedBlogImages.push(img);
  }

  return updatedBlogImages;
}

/**
 * Process animation for an image
 */
async function processImageAnimation(
  imagePath: string,
  webImagePath: string,
  animationPrompt: string,
  options: ProcessingOptions = {}
): Promise<Partial<BlogImageData> | null> {
  // Determine the animation path
  const animationPath = getAnimationPath(imagePath, VIDEOS_PATH);
  const animationWebPath = getAnimationWebPath(webImagePath);

  // Check if the animation exists or if we're forcing regeneration
  if (!fs.existsSync(animationPath) || options.force) {
    console.log(`Generating animation: ${animationPath}`);

    try {
      // Generate the animation
      await animateImage(
        imagePath,
        animationPrompt,
        animationPath,
        { force: options.force }
      );

      return { animated: animationWebPath };
    } catch (error) {
      console.error(`Error generating animation:`, error);
      return null;
    }
  } else {
    console.log(`Animation already exists: ${animationPath}`);
    return { animated: animationWebPath };
  }
}

/**
 * Get default negative prompt for image generation
 */
function getDefaultNegativePrompt(): string {
  return "text, diagram, cartoon, drawing, sketch, low quality, ugly, deformed, blurry, bad anatomy, bad proportions, cloned face, disfigured, fused fingers, fused limbs, extra limbs, extra fingers, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands, watermark, signature, label";
}
