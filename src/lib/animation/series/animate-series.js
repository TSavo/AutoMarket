/**
 * Series Animation Script
 *
 * This script animates series hero images using FramePack AI based on the animation prompts
 * defined in the series' frontmatter.
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
const SERIES_PATH = path.join(HORIZON_CITY_PATH, 'content/stories');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/stories');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/series');

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

    // Call the fal.ai API - Using 16:9 aspect ratio for series
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
        aspect_ratio: "16:9" // Using 16:9 for series
      },
      logs: true,
    });

    console.log('API request ID:', result.requestId);
    console.log('Video generation complete!');

    // Log the API response for debugging
    console.log('API response data:', JSON.stringify(result.data, null, 2));

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
    console.log('Content type:', response.headers['content-type']);

    try {
      // Save the video file
      fs.writeFileSync(outputVideoPath, response.data);

      // Verify the file was saved
      const stats = fs.statSync(outputVideoPath);
      console.log(`Video saved to: ${outputVideoPath} (${stats.size} bytes)`);

      if (stats.size === 0) {
        throw new Error('Saved file is empty');
      }
    } catch (saveError) {
      console.error('Error saving video file:', saveError);
      throw saveError;
    }

    return outputVideoPath;
  } catch (error) {
    console.error('Error generating and saving video:', error);

    // Check for authentication errors
    if (error.status === 401) {
      console.error('Authentication error: Please check your FALAI_API_KEY environment variable.');
      console.error('Current API key:', process.env.FALAI_API_KEY ? `${process.env.FALAI_API_KEY.substring(0, 5)}...` : 'Not set');
    }

    throw error;
  }
}

/**
 * Read a series index file and extract the necessary data
 */
async function readSeriesFile(seriesSlug) {
  try {
    const seriesDir = path.join(SERIES_PATH, seriesSlug);
    const indexPath = path.join(seriesDir, 'index.md');

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Series index file not found at: ${indexPath}`);
    }

    // Read the file content
    const fileContent = fs.readFileSync(indexPath, 'utf8');

    // Parse frontmatter
    const { data, content } = matter(fileContent);

    // Return the series data
    return {
      slug: seriesSlug,
      title: data.title,
      image: data.image,
      animatePrompt: data.animatePrompt,
      animated: data.animated,
      filePath: indexPath,
      data: data,
      content: content
    };
  } catch (error) {
    console.error(`Error reading series file for ${seriesSlug}:`, error);
    throw error;
  }
}

/**
 * Update the series index file with the animated video path
 */
async function updateSeriesFile(seriesFilePath, videoPath) {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(seriesFilePath, 'utf8');

    // Parse frontmatter
    const { data, content } = matter(fileContent);

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/series/${path.basename(videoPath)}`;

    // Add the animated video path
    data.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(seriesFilePath, updatedContent);

    console.log(`✅ Updated series file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating series file ${seriesFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single series
 */
async function processSeries(seriesSlug, force = false) {
  try {
    console.log(`\n=== Processing series: ${seriesSlug} ===`);

    // Step 1: Read the series data
    const seriesData = await readSeriesFile(seriesSlug);
    console.log(`Series: ${seriesData.title}`);

    // Check if the series already has an animated video and the file actually exists
    if (!force && seriesData.animated) {
      // Check if the animated video file actually exists
      const animatedVideoPath = path.join(HORIZON_CITY_PATH, 'public', seriesData.animated);

      if (fs.existsSync(animatedVideoPath)) {
        console.log(`ℹ️ Skipping ${seriesSlug}: Already has an animated video`);
        console.log(`To override, use the --force flag`);
        return false;
      } else {
        console.log(`⚠️ Series has animated property but file doesn't exist: ${seriesData.animated}`);
        console.log(`Proceeding with animation generation...`);
      }
    }

    // Step 2: Use the animation prompt from the series data, or fall back to a default
    let animationPrompt;

    if (seriesData.animatePrompt) {
      animationPrompt = seriesData.animatePrompt;
      console.log('Using animation prompt from series metadata:', animationPrompt);
    } else {
      // Default prompt as fallback
      animationPrompt = "Subtle animation of the cityscape with gentle camera movement, ambient lighting changes, and atmospheric effects";
      console.log('No animatePrompt found in series metadata. Using default prompt:', animationPrompt);
    }

    // Step 3: Get the image path
    if (!seriesData.image) {
      throw new Error(`Series ${seriesSlug} does not have an image defined`);
    }

    const imageRelativePath = seriesData.image;
    const imagePath = path.join(HORIZON_CITY_PATH, 'public', imageRelativePath);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found at: ${imagePath}`);
    }

    console.log(`Using image: ${imageRelativePath}`);

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${seriesSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(imagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the series file
    console.log('Updating series file...');
    await updateSeriesFile(seriesData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${seriesSlug}`);
    console.log(`=== Finished processing ${seriesSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing series ${seriesSlug}:`, error);
    return false;
  }
}

/**
 * Process all series
 */
async function processAllSeries(force = false) {
  try {
    // Get all series directories
    const seriesDirs = fs.readdirSync(SERIES_PATH)
      .filter(dir => fs.statSync(path.join(SERIES_PATH, dir)).isDirectory())
      .filter(dir => dir !== 'index.md' && dir !== 'index.mdx');

    console.log(`Found ${seriesDirs.length} series`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const seriesSlug of seriesDirs) {
      try {
        const success = await processSeries(seriesSlug, force);

        if (success === true) {
          processed++;
        } else if (success === false) {
          skipped++;
        }
      } catch (error) {
        console.error(`Error processing series ${seriesSlug}:`, error);
        failed++;
      }
    }

    console.log(`\n=== Animation Summary ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${seriesDirs.length}`);

    return true;
  } catch (error) {
    console.error('Error processing all series:', error);
    return false;
  }
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

    // Check for --all flag
    if (args.includes('--all')) {
      console.log('Processing all series...');
      await processAllSeries(force);
    } else if (args.length > 0) {
      // Process a single series
      const seriesSlug = args[0];
      await processSeries(seriesSlug, force);
    } else {
      console.error('Error: Missing series slug');
      console.error('Usage: node animate-series.js <series-slug>');
      console.error('       node animate-series.js --all [--force]');
      process.exit(1);
    }

    console.log('Series animation completed!');
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
  processSeries,
  processAllSeries
};
