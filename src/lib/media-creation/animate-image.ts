/**
 * Image Animation Module
 *
 * This module provides a function to animate an image using FramePack AI.
 * It takes an image and an animation prompt and generates a video.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Try to import fal.ai client - handle both ESM and CommonJS
let fal: any;
try {
  // For ESM
  const falModule = require('@fal-ai/client');
  fal = falModule.fal;
} catch (error) {
  console.error('Error importing @fal-ai/client:', error);
  process.exit(1);
}

// Check for required API key
if (!process.env.FALAI_API_KEY) {
  console.error('Error: FALAI_API_KEY environment variable is not set');
  process.exit(1);
}

// Configure fal.ai client with API key
fal.config({
  credentials: process.env.FALAI_API_KEY
});

// Interface for animation options
export interface AnimationOptions {
  force?: boolean;
  fps?: number;
  numFrames?: number;
  videoLength?: number;
  guidanceScale?: number;
  seed?: number;
  aspectRatio?: string;
}

/**
 * Animate an image using FramePack AI
 */
export async function animateImage(
  inputImagePath: string,
  prompt: string,
  outputVideoPath: string,
  options: AnimationOptions = {}
): Promise<string> {
  // Enhance the prompt with consistent animation guidance if not already specified
  if (!prompt.toLowerCase().includes("subtle") &&
      !prompt.toLowerCase().includes("gentle") &&
      !prompt.toLowerCase().includes("motion")) {
    prompt = `${prompt} Create subtle, realistic motion. Maintain photorealistic quality with gentle camera movement and smooth transitions. Avoid rapid changes or unrealistic effects.`;
  }
  try {
    // Check if the input image exists
    if (!fs.existsSync(inputImagePath)) {
      throw new Error(`Input image not found at ${inputImagePath}`);
    }

    // Check if the output video already exists and we're not forcing regeneration
    if (fs.existsSync(outputVideoPath) && !options.force) {
      console.log(`Video already exists at ${outputVideoPath}. Use force option to regenerate.`);
      return outputVideoPath;
    }

    console.log(`Animating image: ${path.basename(inputImagePath)}`);
    console.log(`Animation prompt: ${prompt}`);

    // Read the image file
    const imageBuffer = fs.readFileSync(inputImagePath);

    // Convert to base64 data URI
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(inputImagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log('Image converted to base64 data URI');

    // Default options
    const {
      fps = 30,
      numFrames = 150,
      videoLength = 5,
      guidanceScale = 7.5,
      seed = Math.floor(Math.random() * 1000000),
      aspectRatio = "16:9"
    } = options;

    // Call the fal.ai API
    console.log('Calling FramePack API...');
    let lastReportedProgress = -1;

    const result = await fal.subscribe("fal-ai/framepack", {
      input: {
        prompt: prompt,
        image_url: dataUri,
        num_frames: numFrames,
        fps: fps,
        guidance_scale: guidanceScale,
        seed: seed,
        teacache: true,
        video_length: videoLength,
        aspect_ratio: aspectRatio
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS" && update.logs.length > 0) {
          // Only show the last/latest log message
          const lastLog = update.logs[update.logs.length - 1];

          // Parse progress from the log message (e.g., "  4%|▍         | 1/25 [00:01<00:27,  1.13s/it]")
          const progressMatch = lastLog.message.match(/^\s*(\d+)%\|[^|]*\|\s*(\d+)\/(\d+)/);
          if (progressMatch) {
            const cycleProgress = parseInt(progressMatch[1]); // 0-100% for current cycle
            const currentStep = parseInt(progressMatch[2]); // current step (1-25)
            const totalSteps = parseInt(progressMatch[3]); // total steps per cycle (25)

            // Calculate overall progress across all video seconds
            // We estimate which cycle we're in based on total log count
            const totalLogs = update.logs.length;
            const estimatedCycle = Math.floor(totalLogs / totalSteps);
            const overallProgress = Math.min(100, Math.round(
              ((estimatedCycle * 100) + cycleProgress) / videoLength
            ));

            // Only report progress if it's meaningfully different
            if (overallProgress > lastReportedProgress) {
              console.log(`🎬 Animation Progress: ${overallProgress}% (Processing second ${Math.min(estimatedCycle + 1, videoLength)}/${videoLength})`);
              lastReportedProgress = overallProgress;
            }
          } else {
            // Fallback to showing the raw message if we can't parse it
            console.log(lastLog.message);
          }
        }
      },
    });

    // Get the video URL from the result (handle different response formats)
    let videoUrl: string;
    if (result.data && result.data.video && result.data.video.url) {
      videoUrl = result.data.video.url;
    } else if (result.data && result.data.video_url) {
      videoUrl = result.data.video_url;
    } else if (result.video) {
      videoUrl = result.video;
    } else {
      throw new Error('No video URL found in the API response');
    }

    console.log(`Video generated: ${videoUrl}`);

    // Download the video
    console.log(`Downloading video to ${outputVideoPath}...`);
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
      }
    });

    // Check if we got valid video data
    if (!response.data || response.data.length === 0) {
      throw new Error('Received empty data when downloading the video');
    }

    console.log(`Received ${response.data.length} bytes of video data`);

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputVideoPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the video file
    fs.writeFileSync(outputVideoPath, response.data);

    // Verify the file was saved
    const stats = fs.statSync(outputVideoPath);
    console.log(`Video saved to: ${outputVideoPath} (${stats.size} bytes)`);

    if (stats.size === 0) {
      throw new Error('Saved file is empty');
    }

    return outputVideoPath;
  } catch (error) {
    console.error('Error animating image:', error);
    throw error;
  }
}

/**
 * Generate animation path from image path
 */
export function getAnimationPath(imagePath: string, videosDir: string): string {
  const imageBaseName = path.basename(imagePath, path.extname(imagePath));
  const outputVideoName = `${imageBaseName}-animated.mp4`;
  return path.join(videosDir, outputVideoName);
}

/**
 * Generate web path for animation
 */
export function getAnimationWebPath(imagePath: string, baseDir: string = '/videos/blog'): string {
  const imageBaseName = path.basename(imagePath, path.extname(imagePath));
  const outputVideoName = `${imageBaseName}-animated.mp4`;
  return `${baseDir}/${outputVideoName}`;
}

// If this script is run directly (not imported)
if (require.main === module) {
  // Parse command line arguments and run the animator
  console.log('This module is not meant to be run directly. Import it in your scripts instead.');
  process.exit(1);
}
