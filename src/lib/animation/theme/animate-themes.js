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
const THEMES_PATH = path.join(HORIZON_CITY_PATH, 'content/themes');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/themes');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/themes');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Read a theme markdown file and extract its data
 */
async function readThemeFile(themeSlug) {
  const filePath = path.join(THEMES_PATH, `${themeSlug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Theme file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    slug: themeSlug
  };
}

/**
 * Generate an animation prompt using Ollama
 */
async function generateAnimationPrompt(themeData) {
  // Create a context for the model with relevant theme information
  const context = `
Theme Name: ${themeData.title}
Category: ${themeData.category}
Description: ${themeData.description || 'Unknown'}
Key Questions: ${Array.isArray(themeData.keyQuestions) ? themeData.keyQuestions.join('. ') : themeData.keyQuestions || 'Unknown'}
Manifestations: ${Array.isArray(themeData.manifestations) ? themeData.manifestations.join('. ') : themeData.manifestations || 'Unknown'}
Subthemes: ${Array.isArray(themeData.subthemes) ? themeData.subthemes.join(', ') : themeData.subthemes || 'Unknown'}
  `.trim();

  // Create the prompt for the model
  const prompt = `
I have a detailed image representing a theme from a cyberpunk story called "Horizon City". I want to use FramePack AI to add subtle animation to this EXISTING image.

Here is information about the theme:

${context}

Write a prompt for FramePack that describes ONLY the subtle movements and visual effects that should be added to animate this conceptual image. The prompt should:

1. Focus on subtle symbolic movements and visual effects that represent the abstract theme
2. Include atmospheric elements that enhance the mood and conceptual nature of the theme
3. Be 2-3 sentences long and specific about the visual effects
4. NOT suggest creating a new image or changing the existing image
5. Match the theme's philosophical and conceptual nature

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

    // Call the fal.ai API - Using 16:9 aspect ratio for themes (same as locations)
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
        aspect_ratio: "16:9" // Using 16:9 for themes (same as locations)
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
 * Update a theme markdown file to include the animated video path
 */
async function updateThemeFile(themeFilePath, videoPath) {
  try {
    console.log(`Updating theme file: ${themeFilePath}`);

    // Read the theme file
    const fileContent = fs.readFileSync(themeFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/themes/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(themeFilePath, updatedContent);

    console.log(`✅ Updated theme file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating theme file ${themeFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single theme - does everything in one go
 */
async function processTheme(themeSlug) {
  try {
    console.log(`\n=== Processing theme: ${themeSlug} ===`);

    // Step 1: Read the theme file
    console.log('Reading theme file...');
    const themeData = await readThemeFile(themeSlug);

    // Step 2: Generate animation prompt
    console.log('Generating animation prompt...');
    const animationPrompt = await generateAnimationPrompt(themeData);

    // Step 3: Get the detailed image path (we want to animate the detailed image)
    if (!themeData.images || !themeData.images.detailed) {
      throw new Error(`Theme ${themeSlug} does not have a detailed image defined`);
    }

    const detailedImageRelativePath = themeData.images.detailed;
    const detailedImagePath = path.join(HORIZON_CITY_PATH, 'public', detailedImageRelativePath);

    if (!fs.existsSync(detailedImagePath)) {
      throw new Error(`Detailed image not found at: ${detailedImagePath}`);
    }

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${themeSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(detailedImagePath, animationPrompt, outputVideoPath);

    // Step 6: Update the theme file
    console.log('Updating theme file...');
    await updateThemeFile(themeData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${themeSlug}`);
    console.log(`=== Finished processing ${themeSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing theme ${themeSlug}:`, error);
    return false;
  }
}

/**
 * Process all themes that need animation
 */
async function processAllThemes(force = false) {
  try {
    // Get all theme files
    const themeFiles = fs.readdirSync(THEMES_PATH)
      .filter(file => file.endsWith('.md'));

    console.log(`Found ${themeFiles.length} theme files`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const themeFile of themeFiles) {
      const themeSlug = path.basename(themeFile, '.md');

      // Read the theme data
      const themeData = await readThemeFile(themeSlug);

      // Check if the theme already has an animated video
      if (!force && themeData.images && themeData.images.animated) {
        console.log(`ℹ️ Skipping ${themeSlug}: Already has an animated video`);
        skipped++;
        continue;
      }

      // Check if the theme has a detailed image
      if (!themeData.images || !themeData.images.detailed) {
        console.log(`ℹ️ Skipping ${themeSlug}: No detailed image found`);
        skipped++;
        continue;
      }

      // Process the theme
      const success = await processTheme(themeSlug);

      if (success) {
        processed++;
      } else {
        failed++;
      }
    }

    console.log('\n=== Theme Animation Summary ===');
    console.log(`Total themes: ${themeFiles.length}`);
    console.log(`Successfully processed: ${processed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);

    return processed > 0;
  } catch (error) {
    console.error('Error processing all themes:', error);
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
    console.log('  node animate-themes.js <theme-slug>');
    console.log('  node animate-themes.js --all [--force]');
    console.log('\nOptions:');
    console.log('  --all    Process all themes that need animation');
    console.log('  --force  Force animation even for themes that already have animated videos');
    console.log('  --help   Display this help message');
    return;
  }

  const force = args.includes('--force');

  if (args.includes('--all')) {
    // Process all themes
    console.log('Processing all themes...');
    await processAllThemes(force);
  } else {
    // Process a single theme
    const themeSlug = args[0];
    await processTheme(themeSlug);
  }

  console.log('Theme animation completed!');
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
  processTheme,
  processAllThemes
};
