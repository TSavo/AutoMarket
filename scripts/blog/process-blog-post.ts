/**
 * Blog Post Processing Script
 *
 * This script parses a blog post, checks what images and animations it needs,
 * and calls the appropriate scripts to generate them.
 *
 * Usage:
 *   ts-node process-blog-post.ts <blog-slug> [--force] [--debug] [--audio-only]
 *   ts-node process-blog-post.ts --all [--force] [--debug] [--audio-only]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initializeDirectories, BLOG_POSTS_PATH } from './config';
import { processBlogPost } from './processor';
import type { ProcessingOptions } from './types';
import { chatterboxTTSDockerService } from '../../src/media/ChatterboxTTSDockerService';

// Load environment variables
dotenv.config();

// Initialize directories
initializeDirectories();

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const debug = args.includes('--debug');
    const all = args.includes('--all');
    const audioOnly = args.includes('--audio-only');

    const options: ProcessingOptions = {
      force,
      debug,
      audioOnly
    };

    if (debug) {
      console.log('Debug mode enabled');
    }

    if (audioOnly) {
      console.log('Audio-only mode enabled - skipping image/animation processing');
    }

    // Get the blog slug
    let slug: string | null = null;
    if (!all && args.length > 0 && !args[0].startsWith('--')) {
      slug = args[0];
    }

    if (!slug && !all) {
      console.error('Error: No blog slug provided. Usage: ts-node process-blog-post.ts <blog-slug> [--force] [--debug] [--audio-only]');
      process.exit(1);
    }

    if (all) {
      console.log('Processing all blog posts...');

      // Get all blog post files
      const files = fs.readdirSync(BLOG_POSTS_PATH);
      const mdxFiles = files.filter(file => file.endsWith('.mdx') || file.endsWith('.md'));

      let successCount = 0;
      let failCount = 0;

      for (const file of mdxFiles) {
        const fileSlug = path.basename(file, path.extname(file));
        console.log(`\n=== Processing ${fileSlug} ===`);

        try {
          const success = await processBlogPost(fileSlug, options);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error processing ${fileSlug}:`, error);
          failCount++;
        }
      }

      console.log(`\n=== Summary ===`);
      console.log(`Successful: ${successCount}`);
      console.log(`Failed: ${failCount}`);
      console.log(`Total: ${successCount + failCount}`);
    } else if (slug) {
      // Process a single blog post
      const success = await processBlogPost(slug, options);

      if (!success) {
        console.log('Processing completed with errors');
        process.exit(1);
      }
    }

    console.log('Processing completed successfully');

    // Cleanup any resources before exiting
    await cleanupResources();

    // Set a final timeout to force exit if cleanup doesn't work
    setTimeout(() => {
      console.log('Force exiting after cleanup timeout');
      process.exit(0);
    }, 5000);

    // Force exit to ensure any lingering processes don't keep the script alive
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);

    // Cleanup resources even on error
    try {
      await cleanupResources();
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    // Set a final timeout to force exit if cleanup doesn't work
    setTimeout(() => {
      console.log('Force exiting after error cleanup timeout');
      process.exit(1);
    }, 5000);

    process.exit(1);
  }
}

/**
 * Cleanup function to ensure all resources are properly released
 */
async function cleanupResources() {
  try {
    console.log('Cleaning up resources...');

    // Cleanup TTS services
    await chatterboxTTSDockerService.cleanup();

    // Kill any remaining Docker log monitoring processes
    try {
      const { exec } = require('child_process');
      exec('pkill -f "docker logs -f"', (error: any) => {
        if (error && !error.message.includes('No such process')) {
          console.warn('Warning: Could not kill Docker log processes:', error.message);
        }
      });
    } catch (error) {
      console.warn('Warning: Could not clean up Docker log processes:', error);
    }

    // Clear any remaining timers and intervals
    const highestTimeoutId = Number(setTimeout(() => {}, 0));
    for (let i = 0; i <= highestTimeoutId; i++) {
      clearTimeout(i);
      clearInterval(i);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log('Resource cleanup completed');
  } catch (error) {
    console.error('Error during resource cleanup:', error);
  }
}

// Run the main function
main();
