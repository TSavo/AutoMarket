/**
 * Core blog post processor - orchestrates the workflow
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { processMainImage, processBlogImages } from './image-processor';
import { processAudio } from './audio-processor';
import { findBlogPostBySlug, updateMdxFile } from './utils';
import type { BlogPostData, ProcessingOptions } from './types';

/**
 * Process a blog post
 */
export async function processBlogPost(slug: string, options: ProcessingOptions = {}): Promise<boolean> {
  try {
    console.log(`\n=== Processing blog post: ${slug} ===\n`);

    // Find the MDX file
    const mdxPath = findBlogPostBySlug(slug);
    if (!mdxPath) {
      console.error(`❌ Blog post not found: ${slug}`);
      return false;
    }

    console.log(`Found blog post: ${mdxPath}`);

    // Read and parse the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');
    const { data } = matter(content) as { data: BlogPostData };    let updatedData: Partial<BlogPostData> = {};
    console.log(`data: ${JSON.stringify(data)}`);

    // Create separate promises for image processing and TTS
    const promises: Promise<any>[] = [];

    // Image processing thread
    const imageProcessingPromise = async () => {
      if (!options.audioOnly) {
        console.log('🖼️ Starting image processing thread...');
        const imageResults: Partial<BlogPostData> = {};

        // Process main image if it exists
        if (data.images) {
          const mainImageResult = await processMainImage(slug, data.images, options);
          if (mainImageResult) {
            imageResults.images = mainImageResult;
          }
        }

        // Process blogImages if they exist
        if (data.blogImages && Array.isArray(data.blogImages) && data.blogImages.length > 0) {
          const blogImagesResult = await processBlogImages(slug, data.blogImages, options);
          if (blogImagesResult.length > 0) {
            imageResults.blogImages = blogImagesResult;
          }
        } else {
          console.log(`No blog images found in frontmatter, skipping blog image generation`);
        }

        console.log('🖼️ Image processing thread completed');
        return imageResults;
      } else {
        console.log('🎵 Audio-only mode: Skipping image and animation processing');
        return {};
      }
    };

    // TTS processing thread
    const ttsProcessingPromise = async () => {
      console.log('🎵 Starting TTS processing thread...');
      const audioResults: Partial<BlogPostData> = {};

      const audioResult = await processAudio(slug, mdxPath, options);
      if (audioResult) {
        audioResults.audio = audioResult;
      } else if (!data.audio && fs.existsSync(path.join(__dirname, '../../public/audio/blog', `${slug}.mp3`))) {
        // If audio exists but no metadata in frontmatter, add it
        const audioPath = path.join(__dirname, '../../public/audio/blog', `${slug}.mp3`);
        const stats = fs.statSync(audioPath);
        audioResults.audio = {
          src: `/audio/blog/${slug}.mp3`,
          duration: 0, // Would need to detect from file
          fileSize: stats.size,
          generated: stats.mtime.toISOString(),
          provider: 'chatterbox-docker',
          voice: 'confusion'
        };
        console.log('📝 Added existing audio metadata to frontmatter');
      }

      console.log('🎵 TTS processing thread completed');
      return audioResults;
    };

    // Add both promises to run in parallel
    promises.push(imageProcessingPromise());
    promises.push(ttsProcessingPromise());

    // Wait for both threads to complete
    console.log('⚡ Running image processing and TTS in parallel...');
    const [imageResults, audioResults] = await Promise.all(promises);

    // Merge results from both threads
    updatedData = { ...imageResults, ...audioResults };
    console.log('🎯 Both processing threads completed and joined');

    // Update the MDX file if any data was changed
    if (Object.keys(updatedData).length > 0) {
      await updateMdxFile(mdxPath, updatedData);
    }

    console.log(`\n=== Finished processing blog post: ${slug} ===\n`);
    return true;
  } catch (error) {
    console.error(`Error processing blog post:`, error);
    return false;
  }
}
