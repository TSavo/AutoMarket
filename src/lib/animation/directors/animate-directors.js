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
const DIRECTORS_PATH = path.join(HORIZON_CITY_PATH, 'content/outreach/directors');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/outreach/directors');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/outreach/directors');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Read a director markdown file and extract its data
 */
async function readDirectorFile(directorSlug) {
  const filePath = path.join(DIRECTORS_PATH, `${directorSlug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Director file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    slug: directorSlug
  };
}

/**
 * Get animation prompt from director data or generate a default one
 */
function getAnimationPrompt(directorData) {
  // Check if the director data has a promptText field
  if (directorData.promptText) {
    console.log('Using promptText from director file');
    return directorData.promptText;
  }

  // If no promptText is provided, generate a default prompt based on the director
  const directorName = directorData.title.replace("A Letter to ", "");

  // Default prompts for each director
  const defaultPrompts = {
    'Jordan Peele': "The director's face transforms into a surreal horror mask for a split second before returning to normal, with subtle glitches that suggest reality is breaking down around him.",
    'Denis Villeneuve': "The director's face is bathed in shifting light and shadow as if caught in a sandstorm, his eyes reflecting vast desert landscapes while dust particles float around him.",
    'Michael B. Jordan': "The director dodges Matrix-style bullets in slow motion, his face showing intense concentration as the world bends around him in a cyberpunk action sequence.",
    'Kathryn Bigelow': "The director's eyes reflect scrolling code and neural interface connections, her expression shifting between human and machine as if experiencing someone else's memories.",
    'Alex Garland': "The director's face subtly glitches and reveals artificial components beneath the skin, suggesting he might be an android questioning his own existence.",
    'Steve Pink': "The director's expression cycles through comedic reactions as if time-traveling through different eras, each shift accompanied by subtle cyberpunk interface elements."
  };

  // Get the default prompt for this director or use a generic one
  const prompt = defaultPrompts[directorName] ||
    "The director transforms into a cyber ninja, their face overlaid with digital interface elements and glowing circuit patterns that pulse with energy.";

  console.log('Using default prompt for', directorName);
  console.log('\nAnimation Prompt:');
  console.log('==========================');
  console.log(prompt);
  console.log('==========================');

  return prompt;
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

    // Call the fal.ai API
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
        aspect_ratio: "9:16"
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
 * Update a director markdown file to include the animated video path
 */
async function updateDirectorFile(directorFilePath, videoPath) {
  try {
    console.log(`Updating director file: ${directorFilePath}`);

    // Read the director file
    const fileContent = fs.readFileSync(directorFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/outreach/directors/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(directorFilePath, updatedContent);

    console.log(`✅ Updated director file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating director file ${directorFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single director - does everything in one go
 */
async function processDirector(directorSlug) {
  try {
    console.log(`\n=== Processing director: ${directorSlug} ===`);

    // Step 1: Read the director file
    console.log('Reading director file...');
    const directorData = await readDirectorFile(directorSlug);

    // Step 2: Get animation prompt
    console.log('Getting animation prompt...');
    const animationPrompt = getAnimationPrompt(directorData);

    // Step 3: Get the detailed image path
    const detailedImagePath = path.join(IMAGES_PATH, `${directorSlug}-detailed.png`);
    if (!fs.existsSync(detailedImagePath)) {
      throw new Error(`Detailed image not found at: ${detailedImagePath}`);
    }

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${directorSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(detailedImagePath, animationPrompt, outputVideoPath);

    // Step 6: Convert the video to 2:3 aspect ratio
    console.log('\nStep 6: Converting video to 2:3 aspect ratio...');
    try {
      console.log(`Converting video: ${outputVideoPath}`);
      // Use FFmpeg to convert the video from 9:16 to 2:3 aspect ratio
      const ffmpegCmd = `ffmpeg -y -i "${outputVideoPath}" -vf "crop=iw:iw*3/2:0:(ih-iw*3/2)/2" -c:v libx264 -crf 18 -preset medium "${outputVideoPath}.temp.mp4"`;
      execSync(ffmpegCmd, { stdio: 'inherit' });

      // Replace the original file with the converted one
      fs.renameSync(`${outputVideoPath}.temp.mp4`, outputVideoPath);
      console.log(`✅ Successfully converted video to 2:3 aspect ratio`);
    } catch (error) {
      console.error(`Error converting video: ${error.message}`);
      console.error('Continuing with the original video...');
    }

    // Step 7: Update the director file
    console.log('Updating director file...');
    await updateDirectorFile(directorData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${directorSlug}`);
    console.log(`=== Finished processing ${directorSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing director ${directorSlug}:`, error);
    return false;
  }
}

/**
 * Get all director slugs from the directors directory
 */
function getAllDirectorSlugs() {
  try {
    const files = fs.readdirSync(DIRECTORS_PATH);
    return files
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  } catch (error) {
    console.error('Error reading directors directory:', error);
    return [];
  }
}

/**
 * Check if a director already has an animation
 */
function hasAnimation(directorData) {
  return directorData.images && directorData.images.animated;
}

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Check for --all flag
  if (args.includes('--all')) {
    console.log('Processing all directors...');
    const directorSlugs = getAllDirectorSlugs();

    if (directorSlugs.length === 0) {
      console.error('No directors found in the directory.');
      process.exit(1);
    }

    console.log(`Found ${directorSlugs.length} directors: ${directorSlugs.join(', ')}`);

    // Process each director
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const slug of directorSlugs) {
      try {
        // Check if director already has an animation
        const directorData = await readDirectorFile(slug);

        if (hasAnimation(directorData) && !args.includes('--force')) {
          console.log(`\nSkipping ${slug} - already has an animation`);
          skipCount++;
          continue;
        }

        const success = await processDirector(slug);

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error processing ${slug}:`, error);
        failCount++;
      }
    }

    console.log('\n=== Animation Summary ===');
    console.log(`Total directors: ${directorSlugs.length}`);
    console.log(`Successfully animated: ${successCount}`);
    console.log(`Skipped (already animated): ${skipCount}`);
    console.log(`Failed: ${failCount}`);

    if (successCount > 0) {
      console.log('\nDirector animations completed successfully!');
    } else if (skipCount > 0 && failCount === 0) {
      console.log('\nAll directors already have animations. Use --force to regenerate them.');
    } else {
      console.error('\nFailed to animate any directors.');
      process.exit(1);
    }
  } else if (args.length === 0 || (args.length === 1 && args[0] === '--force')) {
    console.error('Please provide a director slug or use --all');
    console.error('Usage: node animate-directors.js <director-slug> [--force]');
    console.error('       node animate-directors.js --all [--force]');
    console.error('Example: node animate-directors.js alex-garland');
    process.exit(1);
  } else {
    // Process a single director
    const directorSlug = args[0];

    try {
      // Check if director already has an animation
      if (!args.includes('--force')) {
        const directorData = await readDirectorFile(directorSlug);

        if (hasAnimation(directorData)) {
          console.log(`\n${directorSlug} already has an animation. Use --force to regenerate it.`);
          process.exit(0);
        }
      }

      const success = await processDirector(directorSlug);

      if (success) {
        console.log('Director animation completed successfully!');
      } else {
        console.error('Failed to animate director.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }
}

// Run the script
main();
