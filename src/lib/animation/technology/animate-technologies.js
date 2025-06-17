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
const TECHNOLOGIES_PATH = path.join(HORIZON_CITY_PATH, 'content/technologies');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/technologies');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/technologies');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Read a technology markdown file and extract its data
 */
async function readTechnologyFile(technologySlug) {
  const filePath = path.join(TECHNOLOGIES_PATH, `${technologySlug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Technology file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    slug: technologySlug
  };
}

/**
 * Generate an animation prompt using Ollama
 */
async function generateAnimationPrompt(technologyData) {
  // Create a context for the model with relevant technology information
  const context = `
Technology Name: ${technologyData.title}
Category: ${technologyData.category}
Description: ${technologyData.description || 'Unknown'}
Era: ${technologyData.era || 'Unknown'}
Inventor: ${Array.isArray(technologyData.inventor) ? technologyData.inventor.join(', ') : technologyData.inventor || 'Unknown'}
Capabilities: ${Array.isArray(technologyData.capabilities) ? technologyData.capabilities.join('. ') : technologyData.capabilities || 'Unknown'}
Limitations: ${Array.isArray(technologyData.limitations) ? technologyData.limitations.join('. ') : technologyData.limitations || 'Unknown'}
Legal Status: ${technologyData.legalStatus || 'Unknown'}
  `.trim();

  // Create the prompt for the model
  const prompt = `
I have a detailed image representing a technology from a cyberpunk story called "Horizon City". I want to use FramePack AI to add subtle animation to this EXISTING image.

Here is information about the technology:

${context}

Write a prompt for FramePack that describes ONLY the subtle movements and visual effects that should be added to animate this technological image. The prompt should:

1. Focus on subtle technological movements and effects that represent how this technology would function
2. Include power indicators, data flows, or interface elements that would be present in this technology
3. Be 2-3 sentences long and specific about the visual effects
4. NOT suggest creating a new image or changing the existing image
5. Match the technology's cyberpunk aesthetic and functional nature

IMPORTANT: Your response should ONLY be the animation prompt. Do not include any explanations, introductions, notes, or thinking process. Do not use <think> tags. Just provide the direct animation prompt that will be sent to FramePack.
  `.trim();

  try {
    console.log('Sending request to Ollama...');
    // Call the Ollama API
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    // Extract the animation prompt from the response
    let animationPrompt = response.data.response.trim();

    // Remove any <think> sections if they exist
    animationPrompt = animationPrompt.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Additional cleanup to ensure we only have the actual prompt
    // Remove any explanatory text that might start with common patterns
    animationPrompt = animationPrompt.replace(/^(Here's|I'll|The animation|This prompt|My prompt|For this).*?\n/i, '').trim();

    console.log('Generated animation prompt:', animationPrompt);
    return animationPrompt;
  } catch (error) {
    console.error('Error generating animation prompt:', error);
    throw error;
  }
}

/**
 * Generate and save a video using the fal.ai FramePack API
 */
async function generateAndSaveVideo(imagePath, prompt, outputPath) {
  try {
    console.log(`Generating video for image: ${imagePath}`);
    console.log(`Using prompt: ${prompt}`);
    console.log(`Output path: ${outputPath}`);

    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);

    // Convert to base64 data URI
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    console.log('Image converted to base64 data URI');

    // Call the fal.ai API - Using 16:9 aspect ratio for technologies (same as locations and themes)
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
        aspect_ratio: "16:9" // Using 16:9 for technologies (same as locations and themes)
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

    // Download the video
    console.log('Downloading video...');
    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
      }
    });

    // Check if we got valid video data
    if (!videoResponse.data || videoResponse.data.length === 0) {
      throw new Error('Received empty data when downloading the video');
    }

    console.log(`Received ${videoResponse.data.length} bytes of video data`);
    console.log('Content type:', videoResponse.headers['content-type']);

    try {
      // Save the video file
      fs.writeFileSync(outputPath, videoResponse.data);

      // Verify the file was saved
      const stats = fs.statSync(outputPath);
      console.log(`Video saved to: ${outputPath} (${stats.size} bytes)`);

      if (stats.size === 0) {
        throw new Error('Saved file is empty');
      }
    } catch (saveError) {
      console.error('Error saving video file:', saveError);
      throw saveError;
    }

    return outputPath;
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
 * Update a technology markdown file to include the animated video path
 */
async function updateTechnologyFile(technologyFilePath, videoPath) {
  try {
    console.log(`Updating technology file: ${technologyFilePath}`);

    // Read the technology file
    const fileContent = fs.readFileSync(technologyFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/technologies/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(technologyFilePath, updatedContent);

    console.log(`✅ Updated technology file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating technology file ${technologyFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single technology - does everything in one go
 */
async function processTechnology(technologySlug) {
  try {
    console.log(`\n=== Processing technology: ${technologySlug} ===`);

    // Step 1: Read the technology file
    console.log('Reading technology file...');
    const technologyData = await readTechnologyFile(technologySlug);

    // Step 2: Generate animation prompt
    console.log('Generating animation prompt...');
    const animationPrompt = await generateAnimationPrompt(technologyData);

    // Step 3: Get the detailed image path (we want to animate the detailed image)
    if (!technologyData.images || !technologyData.images.detailed) {
      throw new Error(`Technology ${technologySlug} does not have a detailed image defined`);
    }

    const detailedImageRelativePath = technologyData.images.detailed;
    const detailedImagePath = path.join(HORIZON_CITY_PATH, 'public', detailedImageRelativePath);

    if (!fs.existsSync(detailedImagePath)) {
      throw new Error(`Detailed image not found at: ${detailedImagePath}`);
    }

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${technologySlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(detailedImagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the technology file
    console.log('Updating technology file...');
    await updateTechnologyFile(technologyData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${technologySlug}`);
    console.log(`=== Finished processing ${technologySlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing technology ${technologySlug}:`, error);
    return false;
  }
}

/**
 * Process all technologies that need animation
 */
async function processAllTechnologies(force = false) {
  try {
    // Get all technology files
    const technologyFiles = fs.readdirSync(TECHNOLOGIES_PATH)
      .filter(file => file.endsWith('.md'));

    console.log(`Found ${technologyFiles.length} technology files`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const technologyFile of technologyFiles) {
      const technologySlug = path.basename(technologyFile, '.md');

      // Read the technology data
      const technologyData = await readTechnologyFile(technologySlug);

      // Check if the technology already has an animated video
      if (!force && technologyData.images && technologyData.images.animated) {
        console.log(`ℹ️ Skipping ${technologySlug}: Already has an animated video`);
        skipped++;
        continue;
      }

      // Check if the technology has a detailed image
      if (!technologyData.images || !technologyData.images.detailed) {
        console.log(`ℹ️ Skipping ${technologySlug}: No detailed image found`);
        skipped++;
        continue;
      }

      // Process the technology
      const success = await processTechnology(technologySlug);

      if (success) {
        processed++;
      } else {
        failed++;
      }
    }

    console.log('\n=== Technology Animation Summary ===');
    console.log(`Total technologies: ${technologyFiles.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);

    return processed > 0;
  } catch (error) {
    console.error('Error processing all technologies:', error);
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
    console.log('  node animate-technologies.js <technology-slug>');
    console.log('  node animate-technologies.js --all [--force]');
    console.log('\nOptions:');
    console.log('  --all    Process all technologies that need animation');
    console.log('  --force  Force animation even for technologies that already have animated videos');
    console.log('  --help   Display this help message');
    return;
  }

  const force = args.includes('--force');

  if (args.includes('--all')) {
    // Process all technologies
    console.log('Processing all technologies...');
    await processAllTechnologies(force);
  } else {
    // Process a single technology
    const technologySlug = args[0];
    await processTechnology(technologySlug);
  }

  console.log('Technology animation completed!');
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
  processTechnology,
  processAllTechnologies
};
