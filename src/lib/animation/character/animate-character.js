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
const CHARACTERS_PATH = path.join(HORIZON_CITY_PATH, 'content/characters');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/characters');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/characters');

// Ensure videos directory exists
if (!fs.existsSync(VIDEOS_PATH)) {
  fs.mkdirSync(VIDEOS_PATH, { recursive: true });
}

/**
 * Read a character markdown file and extract its data
 */
async function readCharacterFile(characterSlug) {
  const filePath = path.join(CHARACTERS_PATH, `${characterSlug}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Character file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim(),
    filePath: filePath,
    slug: characterSlug
  };
}

/**
 * Generate an animation prompt using Ollama
 */
async function generateAnimationPrompt(characterData) {
  // Create a context for the model with relevant character information
  const context = `
Character Name: ${characterData.fullName || characterData.title}
Gender: ${characterData.gender || 'Unknown'}
Age: ${characterData.age || 'Unknown'}
Occupation: ${Array.isArray(characterData.occupation) ? characterData.occupation.join(', ') : characterData.occupation || 'Unknown'}
Archetype: ${characterData.archetype ? `${characterData.archetype.type} - ${characterData.archetype.description}` : 'Unknown'}
Physical Description: ${Array.isArray(characterData.physicalDescription) ? characterData.physicalDescription.join('. ') : characterData.physicalDescription || 'Unknown'}
Species: ${characterData.species || 'Human'}
Modifications: ${Array.isArray(characterData.modifications) ? characterData.modifications.join('. ') : characterData.modifications || 'None'}
Status: ${characterData.status || 'Unknown'}
  `.trim();

  // Create the prompt for the model
  const prompt = `
I have a still portrait image of a character from a cyberpunk story called "Horizon City". I want to use FramePack AI to add subtle animation to this EXISTING portrait.

Here is information about the character:

${context}

Write a prompt for FramePack that describes ONLY the subtle movements and expressions the character should make in the animated portrait. The prompt should:

1. Begin with something like "The character blinks slowly..." or "The character's expression shifts slightly..."
2. Focus ONLY on facial movements like blinking, slight smiles, subtle frowns, or small head tilts
3. Be 1-2 sentences long and very specific about the facial movements
4. NOT include any body movements below the shoulders
5. NOT include any camera movements, zooming, or panning
6. NOT suggest creating a new image or changing the existing portrait
7. Match the character's personality

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
 * Update a character markdown file to include the animated video path
 */
async function updateCharacterFile(characterFilePath, videoPath) {
  try {
    console.log(`Updating character file: ${characterFilePath}`);

    // Read the character file
    const fileContent = fs.readFileSync(characterFilePath, 'utf-8');

    // Parse the frontmatter and content
    const { data, content } = matter(fileContent);

    // Add the video path to the images section
    if (!data.images) {
      data.images = {};
    }

    // Convert the absolute path to a relative path for the website
    const relativeVideoPath = `/videos/characters/${path.basename(videoPath)}`;

    // Add the animated video path
    data.images.animated = relativeVideoPath;

    // Convert back to markdown with updated frontmatter
    const updatedContent = matter.stringify(content, data);

    // Write the updated content back to the file
    fs.writeFileSync(characterFilePath, updatedContent);

    console.log(`✅ Updated character file with animated video path: ${relativeVideoPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating character file ${characterFilePath}:`, error);
    throw error;
  }
}

/**
 * Process a single character - does everything in one go
 */
async function processCharacter(characterSlug) {
  try {
    console.log(`\n=== Processing character: ${characterSlug} ===`);

    // Step 1: Read the character file
    console.log('Reading character file...');
    const characterData = await readCharacterFile(characterSlug);

    // Step 2: Generate animation prompt
    console.log('Generating animation prompt...');
    const animationPrompt = await generateAnimationPrompt(characterData);

    // Step 3: Get the portrait image path
    const portraitPath = path.join(IMAGES_PATH, `${characterSlug}-portrait.png`);
    if (!fs.existsSync(portraitPath)) {
      throw new Error(`Portrait image not found at: ${portraitPath}`);
    }

    // Step 4: Set the output video path
    const outputVideoPath = path.join(VIDEOS_PATH, `${characterSlug}-animated.mp4`);

    // Step 5: Generate and save the video
    console.log('Generating and saving video...');
    await generateAndSaveVideo(portraitPath, animationPrompt, outputVideoPath);

    // Step 6: Convert the video to 3:4 aspect ratio
    console.log('\nStep 6: Converting video to 3:4 aspect ratio...');
    try {
      console.log(`Converting video: ${outputVideoPath}`);
      // Use FFmpeg to convert the video from 9:16 to 3:4 aspect ratio
      const ffmpegCmd = `ffmpeg -y -i "${outputVideoPath}" -vf "crop=iw:iw*4/3:0:(ih-iw*4/3)/2" -c:v libx264 -crf 18 -preset medium "${outputVideoPath}.temp.mp4"`;
      execSync(ffmpegCmd, { stdio: 'inherit' });

      // Replace the original file with the converted one
      fs.renameSync(`${outputVideoPath}.temp.mp4`, outputVideoPath);
      console.log(`✅ Successfully converted video to 3:4 aspect ratio`);
    } catch (error) {
      console.error(`Error converting video: ${error.message}`);
      console.error('Continuing with the original video...');
    }

    // Step 7: Update the character file
    console.log('Updating character file...');
    await updateCharacterFile(characterData.filePath, outputVideoPath);

    console.log(`\n✅ Successfully processed ${characterSlug}`);
    console.log(`=== Finished processing ${characterSlug} ===\n`);

    return true;
  } catch (error) {
    console.error(`Error processing character ${characterSlug}:`, error);
    return false;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    characterSlug: '',
    customPrompt: null,
    options: {}
  };

  // Extract options and character slug
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check for --prompt option
    if (arg.startsWith('--prompt=')) {
      result.customPrompt = arg.substring('--prompt='.length);
    }
    else if (arg === '--prompt' && i + 1 < args.length) {
      result.customPrompt = args[++i];
    }
    // Check for other options
    else if (arg.startsWith('--')) {
      const option = arg.substring(2);
      result.options[option] = true;
    }
    // First non-option argument is the character slug
    else if (!result.characterSlug) {
      result.characterSlug = arg;
    }
  }

  return result;
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const { characterSlug, customPrompt, options } = parseArgs();

  if (!characterSlug) {
    console.error('Please provide a character slug');
    console.error('Usage: node animate-character.js <character-slug> [options]');
    console.error('Options:');
    console.error('  --prompt="prompt text"   Specify a custom animation prompt (bypasses Ollama)');
    console.error('Example: node animate-character.js akiko');
    console.error('Example: node animate-character.js akiko --prompt="The character blinks slowly and tilts her head slightly."');
    process.exit(1);
  }

  try {
    // If a custom prompt is provided, use a modified process flow
    if (customPrompt) {
      console.log(`\n=== Processing character: ${characterSlug} with custom prompt ===`);
      console.log('Custom prompt:', customPrompt);

      // Step 1: Read the character file
      console.log('Reading character file...');
      const characterData = await readCharacterFile(characterSlug);

      // Step 2: Get the portrait image path
      const portraitPath = path.join(IMAGES_PATH, `${characterSlug}-portrait.png`);
      if (!fs.existsSync(portraitPath)) {
        throw new Error(`Portrait image not found at: ${portraitPath}`);
      }

      // Step 3: Set the output video path
      const outputVideoPath = path.join(VIDEOS_PATH, `${characterSlug}-animated.mp4`);

      // Step 4: Generate and save the video
      console.log('Generating and saving video...');
      await generateAndSaveVideo(portraitPath, customPrompt, outputVideoPath);

      // Step 5: Convert the video to 3:4 aspect ratio
      console.log('\nStep 5: Converting video to 3:4 aspect ratio...');
      try {
        console.log(`Converting video: ${outputVideoPath}`);
        // Use FFmpeg to convert the video from 9:16 to 3:4 aspect ratio
        const ffmpegCmd = `ffmpeg -y -i "${outputVideoPath}" -vf "crop=iw:iw*4/3:0:(ih-iw*4/3)/2" -c:v libx264 -crf 18 -preset medium "${outputVideoPath}.temp.mp4"`;
        execSync(ffmpegCmd, { stdio: 'inherit' });

        // Replace the original file with the converted one
        fs.renameSync(`${outputVideoPath}.temp.mp4`, outputVideoPath);
        console.log(`✅ Successfully converted video to 3:4 aspect ratio`);
      } catch (error) {
        console.error(`Error converting video: ${error.message}`);
        console.error('Continuing with the original video...');
      }

      // Step 6: Update the character file
      console.log('Updating character file...');
      await updateCharacterFile(characterData.filePath, outputVideoPath);

      console.log(`\n✅ Successfully processed ${characterSlug} with custom prompt`);
      console.log(`=== Finished processing ${characterSlug} ===\n`);

      console.log('Character animation completed successfully!');
    } else {
      // Use the standard process flow
      const success = await processCharacter(characterSlug);

      if (success) {
        console.log('Character animation completed successfully!');
      } else {
        console.error('Failed to animate character.');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
