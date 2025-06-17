/**
 * Outreach Animation Script
 *
 * This script animates outreach document images using FramePack AI based on the promptText
 * defined in the outreach document's frontmatter.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure fal.ai client with API key
const apiKey = process.env.FALAI_API_KEY;
if (!apiKey) {
  console.warn('FALAI_API_KEY environment variable is not set!');
} else {
  console.log('API Key found, configuring fal.ai client...');
  fal.config({
    credentials: apiKey
  });
}

// Configuration
const HORIZON_CITY_PATH = path.resolve(__dirname, '../../..');
const OUTREACH_PATH = path.join(HORIZON_CITY_PATH, 'content/outreach');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/outreach');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/outreach');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
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
    const result = await fal.subscribe("fal-ai/framepack", {
      input: {
        prompt: prompt,
        image_url: dataUri,
        num_frames: 150,
        fps: 30,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000),
        teacache: true,
        video_length: 5, // in seconds
        aspect_ratio: "16:9" // Using 16:9 for outreach documents
      },
      logs: true,
    });

    console.log('API request ID:', result.requestId);
    console.log('Video generation complete!');

    // Get the video URL from the result (handle different response formats)
    let videoUrl;
    if (result.data.video && result.data.video.url) {
      videoUrl = result.data.video.url;
    } else if (result.data.video_url) {
      videoUrl = result.data.video_url;
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
    console.error('Error generating and saving video:', error);

    // Check for authentication errors
    if (error.status === 401) {
      console.error('Authentication error: Please check your FALAI_API_KEY environment variable.');
    }

    throw error;
  }
}

/**
 * Read an outreach document file and extract the necessary data
 */
async function readOutreachFile(outreachSlug) {
  try {
    const filePath = path.join(OUTREACH_PATH, `${outreachSlug}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Outreach file not found at: ${filePath}`);
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse frontmatter
    const { data, content } = matter(fileContent);

    // Return the outreach data
    return {
      slug: outreachSlug,
      title: data.title,
      images: data.images,
      filePath: filePath,
      data: data,
      content: content
    };
  } catch (error) {
    console.error(`Error reading outreach file for ${outreachSlug}:`, error);
    throw error;
  }
}

/**
 * Update the outreach document file with the animated video path
 */
async function updateOutreachFile(outreachFilePath, videoPath) {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(outreachFilePath, 'utf8');

    // Parse frontmatter
    const { data, content } = matter(fileContent);

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/outreach/${path.basename(videoPath)}`;

    // Add the animated video path to the images section
    if (!data.images) {
      data.images = {};
    }

    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(outreachFilePath, updatedContent);

    console.log(`✅ Updated outreach file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating outreach file ${outreachFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single outreach document
 */
async function processOutreach(outreachSlug, force = false) {
  try {
    console.log(`\n=== Processing outreach document: ${outreachSlug} ===`);

    // Step 1: Read the outreach data
    const outreachData = await readOutreachFile(outreachSlug);
    console.log(`Outreach: ${outreachData.title}`);

    // Check if the outreach document already has an animated video and the file actually exists
    if (!force && outreachData.images && outreachData.images.animated) {
      // Check if the animated video file actually exists
      const animatedVideoPath = path.join(HORIZON_CITY_PATH, 'public', outreachData.images.animated);

      if (fs.existsSync(animatedVideoPath)) {
        console.log(`ℹ️ Skipping ${outreachSlug}: Already has an animated video`);
        console.log(`To override, use the --force flag`);
        return false;
      } else {
        console.log(`⚠️ Outreach document has animated property but file doesn't exist: ${outreachData.images.animated}`);
        console.log(`Proceeding with animation generation...`);
      }
    }

    // Step 2: Use the promptText from the outreach data, or fall back to a default
    let animationPrompt;

    if (outreachData.images && outreachData.images.promptText) {
      animationPrompt = outreachData.images.promptText;
      console.log('Using promptText from outreach metadata:', animationPrompt);
    } else {
      // Default prompt as fallback
      animationPrompt = "Subtle camera movement across the cyberpunk cityscape with gentle lighting changes and atmospheric effects";
      console.log('No promptText found in outreach metadata. Using default prompt:', animationPrompt);
    }

    // Step 3: Get the detailed image path
    if (!outreachData.images || !outreachData.images.detailed) {
      throw new Error(`Outreach document ${outreachSlug} does not have a detailed image defined`);
    }

    const imageRelativePath = outreachData.images.detailed;
    const imagePath = path.join(HORIZON_CITY_PATH, 'public', imageRelativePath);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Detailed image not found at: ${imagePath}`);
    }

    console.log(`Using image: ${imageRelativePath}`);

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${outreachSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(imagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the outreach file
    console.log('Updating outreach file...');
    await updateOutreachFile(outreachData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${outreachSlug}`);
    console.log(`=== Finished processing ${outreachSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing outreach document ${outreachSlug}:`, error);
    return false;
  }
}

/**
 * Process all outreach documents of a specific type
 */
async function processOutreachByType(type, force = false) {
  try {
    // Get all outreach document files
    const outreachFiles = fs.readdirSync(OUTREACH_PATH)
      .filter(file => file.endsWith('.md'));

    console.log(`Found ${outreachFiles.length} outreach files`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const outreachFile of outreachFiles) {
      try {
        const outreachSlug = path.basename(outreachFile, '.md');

        // Read the outreach data to check its type
        const fileContent = fs.readFileSync(path.join(OUTREACH_PATH, outreachFile), 'utf8');
        const { data } = matter(fileContent);

        // Skip if not the requested type
        if (type && data.type !== type) {
          console.log(`ℹ️ Skipping ${outreachSlug}: Not of type "${type}" (is "${data.type || 'undefined'}")`);
          skipped++;
          continue;
        }

        const success = await processOutreach(outreachSlug, force);

        if (success === true) {
          processed++;
        } else if (success === false) {
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing outreach file:`, error);
        failed++;
      }
    }

    console.log(`\n=== Animation Summary ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${outreachFiles.length}`);

    return true;
  } catch (error) {
    console.error('Error processing outreach documents:', error);
    return false;
  }
}

/**
 * Process all outreach documents
 */
async function processAllOutreach(force = false) {
  return processOutreachByType(null, force);
}

/**
 * Main function
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);

    // Check for --force flag
    const forceIndex = args.indexOf('--force');
    const force = forceIndex !== -1;

    if (force) {
      // Remove the --force flag from args
      args.splice(forceIndex, 1);
    }

    // Check for --type flag
    const typeIndex = args.indexOf('--type');
    let type = null;

    if (typeIndex !== -1 && args.length > typeIndex + 1) {
      type = args[typeIndex + 1];
      // Remove the --type flag and its value from args
      args.splice(typeIndex, 2);
    }

    // Check for --all flag
    if (args.includes('--all')) {
      if (type) {
        console.log(`Processing all outreach documents of type "${type}"...`);
        await processOutreachByType(type, force);
      } else {
        console.log('Processing all outreach documents...');
        await processAllOutreach(force);
      }
    } else if (args.includes('--business')) {
      console.log('Processing all business outreach documents...');
      await processOutreachByType('business', force);
    } else if (args.length > 0) {
      // Process a single outreach document
      const outreachSlug = args[0];
      await processOutreach(outreachSlug, force);
    } else {
      console.error('Error: Missing outreach slug');
      console.error('Usage: node animate-outreach.js <outreach-slug>');
      console.error('       node animate-outreach.js --all [--force]');
      console.error('       node animate-outreach.js --business [--force]');
      console.error('       node animate-outreach.js --all --type business [--force]');
      process.exit(1);
    }

    console.log('Outreach animation completed!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = {
  processOutreach,
  processOutreachByType,
  processAllOutreach
};