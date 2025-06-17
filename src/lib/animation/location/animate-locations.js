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
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL = 'deepseek-r1:7b';
const HORIZON_CITY_PATH = path.resolve(__dirname, '../../..');
const LOCATIONS_PATH = path.join(HORIZON_CITY_PATH, 'content/locations');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/locations');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/locations');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Read a location markdown file and extract its data
 */
async function readLocationFile(locationSlug) {
  const filePath = path.join(LOCATIONS_PATH, `${locationSlug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Location file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    slug: locationSlug
  };
}

/**
 * Generate an animation prompt using Ollama
 */
async function generateAnimationPrompt(locationData) {
  // Create a context for the model with relevant location information
  const context = `
Location Name: ${locationData.title}
Level: ${locationData.level}
District: ${locationData.district || 'Unknown'}
Description: ${locationData.description || 'Unknown'}
Notable Features: ${Array.isArray(locationData.notableFeatures) ? locationData.notableFeatures.join('. ') : locationData.notableFeatures || 'Unknown'}
History: ${locationData.history || 'Unknown'}
  `.trim();

  // Create the prompt for the model
  const prompt = `
I have a detailed image of a location from a cyberpunk story called "Horizon City". I want to use FramePack AI to add subtle animation to this EXISTING image.

Here is information about the location:

${context}

Write a prompt for FramePack that describes ONLY the subtle movements and environmental effects that should be added to the animated location image. The prompt should:

1. Focus on subtle environmental effects that would naturally occur in this specific location based on its description and features.
2. Include subtle movements that would be appropriate for the location (people walking by, vehicles moving, etc.)
3. Be 2-3 sentences long and specific about the environmental effects
4. NOT suggest creating a new image or changing the existing image
5. Match the location's atmosphere and setting

IMPORTANT: Your response should ONLY be the animation prompt. Do not include any explanations, introductions, or notes.
  `.trim();

  try {
    console.log('Sending request to Ollama...');
    // Call the Ollama API
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    // Extract and clean the response
    let generatedPrompt = response.data.response.trim();

    // Remove any thinking process sections
    generatedPrompt = generatedPrompt.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Remove any markdown formatting or quotes
    generatedPrompt = generatedPrompt.replace(/^```.*$/gm, '').trim();
    generatedPrompt = generatedPrompt.replace(/^"(.*)"$/gm, '$1').trim();

    console.log('\nGenerated Animation Prompt:');
    console.log('==========================');
    console.log(generatedPrompt);
    console.log('==========================');

    return generatedPrompt;
  } catch (error) {
    console.error('Error generating prompt with Ollama:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw new Error(`Failed to generate animation prompt: ${error.message}`);
  }
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

    // Call the fal.ai API - NOTE: Using 16:9 aspect ratio for locations
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
        aspect_ratio: "16:9" // Using 16:9 for locations instead of 9:16
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
 * Update a location markdown file to include the animated video path
 */
async function updateLocationFile(locationFilePath, videoPath) {
  try {
    console.log(`Updating location file: ${locationFilePath}`);

    // Read the location file
    const fileContent = fs.readFileSync(locationFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/locations/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(locationFilePath, updatedContent);

    console.log(`✅ Updated location file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating location file ${locationFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single location - does everything in one go
 */
async function processLocation(locationSlug, customPrompt = null) {
  try {
    console.log(`\n=== Processing location: ${locationSlug} ===`);

    // Step 1: Read the location file
    console.log('Reading location file...');
    const locationData = await readLocationFile(locationSlug);

    // Step 2: Generate or use provided animation prompt
    let animationPrompt;
    if (customPrompt) {
      console.log('Using custom animation prompt...');
      animationPrompt = customPrompt;
      console.log('\nCustom Animation Prompt:');
      console.log('==========================');
      console.log(animationPrompt);
      console.log('==========================');
    } else {
      console.log('Generating animation prompt with Ollama...');
      animationPrompt = await generateAnimationPrompt(locationData);
    }

    // Step 3: Get the detailed image path (we want to animate the detailed image)
    if (!locationData.images || !locationData.images.detailed) {
      throw new Error(`Location ${locationSlug} does not have a detailed image defined`);
    }

    const detailedImageRelativePath = locationData.images.detailed;
    const detailedImagePath = path.join(HORIZON_CITY_PATH, 'public', detailedImageRelativePath);

    if (!fs.existsSync(detailedImagePath)) {
      throw new Error(`Detailed image not found at: ${detailedImagePath}`);
    }

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${locationSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(detailedImagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the location file
    console.log('Updating location file...');
    await updateLocationFile(locationData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${locationSlug}`);
    console.log(`=== Finished processing ${locationSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing location ${locationSlug}:`, error);
    return false;
  }
}

/**
 * Process all locations that need animation
 */
async function processAllLocations(force = false) {
  try {
    // Get all location files
    const locationFiles = fs.readdirSync(LOCATIONS_PATH)
      .filter(file => file.endsWith('.md'));

    console.log(`Found ${locationFiles.length} location files`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const locationFile of locationFiles) {
      const locationSlug = path.basename(locationFile, '.md');

      // Read the location data
      const locationData = await readLocationFile(locationSlug);

      // Check if the location already has an animated video
      if (!force && locationData.images && locationData.images.animated) {
        console.log(`ℹ️ Skipping ${locationSlug}: Already has an animated video`);
        skipped++;
        continue;
      }

      // Check if the location has a detailed image
      if (!locationData.images || !locationData.images.detailed) {
        console.log(`ℹ️ Skipping ${locationSlug}: No detailed image found`);
        skipped++;
        continue;
      }

      // Process the location
      const success = await processLocation(locationSlug);

      if (success) {
        processed++;
      } else {
        failed++;
      }
    }

    console.log('\n=== Location Animation Summary ===');
    console.log(`Total locations: ${locationFiles.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);

    return processed > 0;
  } catch (error) {
    console.error('Error processing all locations:', error);
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
    console.log('  node animate-locations.js <location-slug> [--prompt "your animation prompt"]');
    console.log('  node animate-locations.js --all [--force]');
    console.log('\nOptions:');
    console.log('  --all     Process all locations that need animation');
    console.log('  --force   Force animation even for locations that already have animated videos');
    console.log('  --prompt  Specify animation prompt directly, bypassing Ollama');
    console.log('  --help    Display this help message');
    return;
  }

  const force = args.includes('--force');

  // Check for custom prompt
  let customPrompt = null;
  const promptIndex = args.indexOf('--prompt');
  if (promptIndex !== -1 && promptIndex + 1 < args.length) {
    customPrompt = args[promptIndex + 1];
    console.log('Custom prompt provided:', customPrompt);
  }

  if (args.includes('--all')) {
    // Process all locations
    console.log('Processing all locations...');

    // Note: Custom prompts are not supported with --all since each location would need a different prompt
    if (customPrompt) {
      console.warn('Warning: Custom prompts are not supported with --all. The prompt will be ignored.');
      customPrompt = null;
    }

    await processAllLocations(force);
  } else {
    // Process a single location
    // Find the first argument that's not an option (doesn't start with --)
    const locationSlug = args.find(arg => !arg.startsWith('--') && args.indexOf(`--prompt`) !== args.indexOf(arg) - 1);

    if (!locationSlug) {
      console.error('Error: Missing location slug');
      console.log('Run with --help for usage information');
      process.exit(1);
    }

    await processLocation(locationSlug, customPrompt);
  }

  console.log('Location animation completed!');
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
  processLocation,
  processAllLocations,
  generateAnimationPrompt
};
