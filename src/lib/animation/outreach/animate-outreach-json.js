/**
 * Outreach Animation Script for JSON-based images
 *
 * This script animates outreach document images using FramePack AI based on the animation prompts
 * defined in the outreach-images.json file.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure fal.ai client with API key
const apiKey = process.env.FALAI_API_KEY;
if (!apiKey) {
  console.error('FALAI_API_KEY environment variable is not set!');
  process.exit(1);
} else {
  console.log('API Key found, configuring fal.ai client...');
  fal.config({
    credentials: apiKey
  });
}

// Define paths
const ROOT_PATH = path.join(__dirname, '../../..');
const VIDEOS_PATH = path.join(ROOT_PATH, 'public/videos/outreach');
const JSON_PATH = path.join(ROOT_PATH, 'outreach-images.json');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
  console.log(`Created directory: ${VIDEOS_PATH}`);
}

/**
 * Generate and save a video using FramePack
 */
async function generateAndSaveVideo(inputImagePath, prompt, outputVideoPath) {
  try {
    console.log('Starting video generation...');
    console.log(`Input image: ${inputImagePath}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`Output will be saved to: ${outputVideoPath}`);

    // Validate input file exists
    if (!fs.existsSync(inputImagePath)) {
      throw new Error(`Input image not found at: ${inputImagePath}`);
    }

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputVideoPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created output directory: ${outputDir}`);
    }

    // Read the image file
    const imageBuffer = fs.readFileSync(inputImagePath);

    // Convert to base64 data URI
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(inputImagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log('Image converted to base64 data URI');

    // Call the fal.ai API - Using 16:9 aspect ratio for outreach documents
    console.log('Calling FramePack API...');
    const videoLength = 5; // in seconds
    let lastReportedProgress = -1;

    const result = await fal.subscribe("fal-ai/framepack", {
      input: {
        prompt: prompt,
        image_url: dataUri,
        num_frames: 150,
        fps: 30,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
        teacache: true,
        video_length: videoLength,
        aspect_ratio: "16:9" // Using 16:9 for outreach documents
      },
      logs: true,
      onQueueUpdate: (update) => {
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

    console.log('Video generation complete!');

    // Get the video URL from the result (handle different response formats)
    let videoUrl;
    if (result.data && result.data.video && result.data.video.url) {
      videoUrl = result.data.video.url;
    } else if (result.data && result.data.video_url) {
      videoUrl = result.data.video_url;
    } else if (result.video) {
      videoUrl = result.video;
    } else {
      throw new Error('No video URL found in the API response');
    }

    console.log('Downloading video from:', videoUrl);

    // Download the video file
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
    console.error('Error generating video:', error);
    throw error;
  }
}

/**
 * Update the JSON file with the animated video path
 */
async function updateJsonFile(jsonPath, filename, videoPath) {
  try {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Find the image entry by filename
    const imageEntry = jsonData.outreachImages.find(img => img.filename === filename);

    if (!imageEntry) {
      throw new Error(`Image entry with filename ${filename} not found in JSON file`);
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/outreach/${path.basename(videoPath)}`;

    // Add the animated video path to the image entry
    imageEntry.animatedPath = relativeVideoPath;

    // Write the updated JSON back to the file
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

    console.log(`✅ Updated JSON file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating JSON file ${jsonPath}:`, error);
    throw error;
  }
}

/**
 * Process a single image from the JSON file
 */
async function processImage(imageData, force = false) {
  try {
    const { filename, location, animationPrompt } = imageData;

    console.log(`\n=== Processing ${filename} ===`);

    // Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${path.basename(filename, '.png')}-animated.mp4`);

    // Check if the video already exists and we're not forcing regeneration
    if (fs.existsSync(outputVideoPath) && !force) {
      console.log(`ℹ️ Video already exists at ${outputVideoPath}. Use --force to regenerate.`);

      // Still update the JSON if the animatedPath is not set
      if (!imageData.animatedPath) {
        const relativeVideoPath = `/videos/outreach/${path.basename(outputVideoPath)}`;
        console.log(`Updating JSON with existing video path: ${relativeVideoPath}`);
        await updateJsonFile(JSON_PATH, filename, outputVideoPath);
      }

      return false;
    }

    // Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(location, animationPrompt, outputVideoPath);

    // Update the JSON file
    console.log('Updating JSON file...');
    await updateJsonFile(JSON_PATH, filename, outputVideoPath);

    console.log(`\n✅ Successfully processed ${filename}`);
    console.log(`=== Finished processing ${filename} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing image ${imageData.filename}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const all = args.includes('--all');

    // Get the image filename if specified
    let targetFilename = null;
    if (!all && args.length > 0 && !args[0].startsWith('--')) {
      targetFilename = args[0];
      if (!targetFilename.endsWith('.png')) {
        targetFilename += '.png';
      }
    }

    // Read the JSON file
    console.log(`Reading JSON file: ${JSON_PATH}`);
    const jsonData = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

    // Process images
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    if (targetFilename) {
      // Process a single image
      const imageData = jsonData.outreachImages.find(img => img.filename === targetFilename);

      if (!imageData) {
        console.error(`Error: Image with filename ${targetFilename} not found in JSON file`);
        process.exit(1);
      }

      const success = await processImage(imageData, force);
      if (success) processed++;
      else skipped++;
    } else if (all) {
      // Process all images
      for (const imageData of jsonData.outreachImages) {
        try {
          const success = await processImage(imageData, force);
          if (success) processed++;
          else skipped++;
        } catch (error) {
          console.error(`Error processing image ${imageData.filename}:`, error);
          failed++;
        }
      }
    } else {
      console.log('No image specified and --all not provided. Use --all to process all images or specify a filename.');
      process.exit(1);
    }

    // Print summary
    console.log('\n=== Animation Summary ===');
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${processed + skipped + failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the main function
main();
