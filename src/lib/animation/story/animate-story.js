const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const axios = require('axios');
const { fal } = require('@fal-ai/client');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

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
const STORIES_PATH = path.join(HORIZON_CITY_PATH, 'content/stories');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/stories');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Find the actual story directory with potential numbered prefix
 */
function findStoryDirectory(seriesSlug, storySlug) {
  const seriesPath = path.join(STORIES_PATH, seriesSlug);

  if (!fs.existsSync(seriesPath)) {
    throw new Error(`Series path not found: ${seriesPath}`);
  }

  // Get all directories in the series path
  const dirs = fs.readdirSync(seriesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // First try exact match
  if (dirs.includes(storySlug)) {
    return storySlug;
  }

  // Then try with numbered prefix (e.g., "03-thief" for "thief")
  const prefixedDir = dirs.find(dir => {
    // Match either the exact slug or a numbered prefix followed by the slug
    return dir === storySlug || dir.match(new RegExp(`\\d+-${storySlug}$`));
  });

  if (prefixedDir) {
    return prefixedDir;
  }

  throw new Error(`Could not find directory for story "${storySlug}" in series "${seriesSlug}"`);
}

/**
 * Read a story index markdown file and extract its data
 */
async function readStoryFile(seriesSlug, storySlug) {
  // Find the actual directory with potential numbered prefix
  const storyDir = findStoryDirectory(seriesSlug, storySlug);

  const filePath = path.join(STORIES_PATH, seriesSlug, storyDir, 'index.md');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Story file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    seriesSlug,
    storySlug: storyDir // Use the actual directory name with prefix
  };
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

    // Read and convert the image to base64
    const imageBuffer = fs.readFileSync(inputImagePath);
    const base64Image = imageBuffer.toString('base64');
    const fileExtension = path.extname(inputImagePath).substring(1).toLowerCase();
    const mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg'
      ? 'image/jpeg'
      : `image/${fileExtension}`;
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log('Image converted to base64 data URI');

    // Call the fal.ai API - Using 16:9 aspect ratio for stories
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
        aspect_ratio: "16:9" // Using 16:9 for stories
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
 * Update a story markdown file to include the animated video path
 */
async function updateStoryFile(storyFilePath, videoPath) {
  try {
    console.log(`Updating story file: ${storyFilePath}`);

    // Read the story file
    const fileContent = fs.readFileSync(storyFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/stories/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(storyFilePath, updatedContent);

    console.log(`✅ Updated story file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating story file ${storyFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single story - does everything in one go
 */
async function processStory(seriesSlug, storySlug, force = false) {
  try {
    console.log(`\n=== Processing story: ${seriesSlug}/${storySlug} ===`);

    // Step 1: Read the story file
    console.log('Reading story file...');
    const storyData = await readStoryFile(seriesSlug, storySlug);

    // Check if the story already has an animated video and the file actually exists
    if (!force && storyData.images && storyData.images.animated) {
      // Check if the animated video file actually exists
      const animatedVideoPath = path.join(HORIZON_CITY_PATH, 'public', storyData.images.animated);

      if (fs.existsSync(animatedVideoPath)) {
        console.log(`ℹ️ Skipping ${storySlug}: Already has an animated video`);
        console.log(`To override, use the --force flag`);
        return false;
      } else {
        console.log(`⚠️ Story has animated property but file doesn't exist: ${storyData.images.animated}`);
        console.log(`Proceeding with animation generation...`);
      }
    }

    // Step 2: Use the animation prompt from the story data, or fall back to a default
    let animationPrompt;

    if (storyData.images && storyData.images.animatePrompt) {
      animationPrompt = storyData.images.animatePrompt;
      console.log('Using animation prompt from story metadata:', animationPrompt);
    } else {
      // Default prompt as fallback
      animationPrompt = "The camera pans away as they turn their back to the camera and walk away";
      console.log('No animatePrompt found in story metadata. Using default prompt:', animationPrompt);
    }

    // Step 3: Get the detailed image path (or fall back to hero image if detailed is not available)
    if (!storyData.images) {
      throw new Error(`Story ${storySlug} does not have any images defined`);
    }

    let imageRelativePath;
    let imageType;

    if (storyData.images.detailed) {
      imageRelativePath = storyData.images.detailed;
      imageType = 'detailed';
    } else if (storyData.images.hero) {
      imageRelativePath = storyData.images.hero;
      imageType = 'hero';
      console.log(`⚠️ No detailed image found for ${storySlug}, falling back to hero image`);
    } else {
      throw new Error(`Story ${storySlug} does not have a detailed or hero image defined`);
    }

    const imagePath = path.join(HORIZON_CITY_PATH, 'public', imageRelativePath);

    if (!fs.existsSync(imagePath)) {
      throw new Error(`${imageType} image not found at: ${imagePath}`);
    }

    console.log(`Using ${imageType} image: ${imageRelativePath}`);

    // Step 4: Set the output video path
    // Extract the story name without the numbered prefix for cleaner filenames
    const storyName = storySlug.replace(/^\d+-/, '');
    const outputVideoPath = path.join(VIDEOS_PATH, `${seriesSlug}-${storyName}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(imagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the story file
    console.log('Updating story file...');
    await updateStoryFile(storyData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${seriesSlug}/${storySlug}`);
    console.log(`=== Finished processing ${seriesSlug}/${storySlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing story ${seriesSlug}/${storySlug}:`, error);
    return false;
  }
}

/**
 * Process all stories in a series
 */
async function processAllStoriesInSeries(seriesSlug, force = false) {
  try {
    const seriesPath = path.join(STORIES_PATH, seriesSlug);

    if (!fs.existsSync(seriesPath)) {
      throw new Error(`Series path not found: ${seriesPath}`);
    }

    // Get all story directories in the series
    const storyDirs = fs.readdirSync(seriesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${storyDirs.length} stories in series ${seriesSlug}`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const storySlug of storyDirs) {
      // Skip "coming-soon" placeholders
      if (storySlug.includes('coming-soon')) {
        console.log(`ℹ️ Skipping ${storySlug}: Coming soon placeholder`);
        skipped++;
        continue;
      }

      try {
        // Read the story data
        const storyData = await readStoryFile(seriesSlug, storySlug);

        // Make sure the story has either a detailed image or a hero image
        // The animation prompt will be read from the story metadata if available
        if (!storyData.images || (!storyData.images.detailed && !storyData.images.hero)) {
          console.log(`ℹ️ Skipping ${storySlug}: No detailed or hero image found`);
          skipped++;
          continue;
        }

        // Process the story (passing the force flag)
        const success = await processStory(seriesSlug, storySlug, force);

        if (success === true) {
          processed++;
        } else if (success === false) {
          // If processStory returns false, it means the story was skipped because it already has an animated video
          skipped++;
        } else {
          // If processStory throws an error, it will be caught by the catch block
          failed++;
        }
      } catch (error) {
        console.error(`Error processing story ${storySlug}:`, error);
        failed++;
      }
    }

    console.log(`\n=== Series ${seriesSlug} Animation Summary ===`);
    console.log(`Total stories: ${storyDirs.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);

    return processed > 0;
  } catch (error) {
    console.error(`Error processing series ${seriesSlug}:`, error);
    return false;
  }
}

/**
 * Process all stories in all series
 */
async function processAllStories(force = false) {
  try {
    // Get all series directories
    const seriesDirs = fs.readdirSync(STORIES_PATH, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Found ${seriesDirs.length} series`);

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const seriesSlug of seriesDirs) {
      // Skip horizons-dawn and horizons-end series
      if (seriesSlug === 'horizons-dawn' || seriesSlug === 'horizons-end') {
        console.log(`\n=== Skipping series: ${seriesSlug} ===`);
        totalSkipped++;
        continue;
      }

      console.log(`\n=== Processing series: ${seriesSlug} ===`);

      try {
        const result = await processAllStoriesInSeries(seriesSlug, force);

        // Add to totals (approximate since we don't have exact counts returned)
        if (result) {
          totalProcessed++;
        }
      } catch (error) {
        console.error(`Error processing series ${seriesSlug}:`, error);
        totalFailed++;
      }
    }

    console.log('\n=== Overall Animation Summary ===');
    console.log(`Total series: ${seriesDirs.length}`);
    console.log(`Series with successful processing: ${totalProcessed}`);
    console.log(`Series skipped (horizons-dawn, horizons-end): ${totalSkipped}`);
    console.log(`Series with failures: ${totalFailed}`);

    return totalProcessed > 0;
  } catch (error) {
    console.error('Error processing all stories:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage:');
    console.log('  node animate-story.js <series-slug> <story-slug>');
    console.log('  node animate-story.js --series <series-slug> [--force]');
    console.log('  node animate-story.js --all [--force]');
    console.log('\nOptions:');
    console.log('  --series  Process all stories in the specified series');
    console.log('  --all     Process all stories in all series');
    console.log('  --force   Force animation even for stories that already have animated videos');
    console.log('  --help    Display this help message');
    console.log('\nNotes:');
    console.log('  - <story-slug> can be with or without the numbered prefix (e.g., "thief" or "03-thief")');
    console.log('  - The script will automatically find the correct story directory');
    return;
  }

  const force = args.includes('--force');

  if (args.includes('--all')) {
    // Process all stories in all series
    console.log('Processing all stories in all series...');
    await processAllStories(force);
  } else if (args.includes('--series')) {
    // Process all stories in a specific series
    const seriesIndex = args.indexOf('--series');
    if (seriesIndex === -1 || seriesIndex + 1 >= args.length) {
      console.error('Error: Missing series slug after --series');
      process.exit(1);
    }

    const seriesSlug = args[seriesIndex + 1];
    console.log(`Processing all stories in series ${seriesSlug}...`);
    await processAllStoriesInSeries(seriesSlug, force);
  } else {
    // Process a single story
    if (args.length < 2) {
      console.error('Error: Missing series slug and/or story slug');
      console.error('Usage: node animate-story.js <series-slug> <story-slug>');
      process.exit(1);
    }

    const seriesSlug = args[0];
    const storySlug = args[1];
    await processStory(seriesSlug, storySlug, force);
  }

  console.log('Story animation completed!');
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

// Export functions for use in other scripts
module.exports = {
  processStory,
  processAllStoriesInSeries,
  processAllStories
};
