const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!REPLICATE_API_TOKEN) {
  console.error('Error: REPLICATE_API_TOKEN is required. Please add it to your .env file.');
  process.exit(1);
}

/**
 * Generate an image using Replicate's API with the ultra raw true setting
 * @param {string} prompt - The prompt to generate the image from
 * @param {object} options - Additional options for image generation
 * @returns {Promise<Buffer>} - A promise that resolves to the image buffer
 */
async function generateImageWithReplicate(prompt, options = {}) {
  const {
    width = 2752,
    height = 1536,
    model = "black-forest-labs/flux-1.1-pro-ultra", // Using the ultra model
    negative_prompt = "",
    num_inference_steps = 30,
    guidance_scale = 7.5,
    raw = true, // Default to raw=true for more natural-looking images
  } = options;

  console.log(`Generating image with prompt: "${prompt}"...`);
  if (negative_prompt) {
    console.log(`Using negative prompt: "${negative_prompt}"`);
  }
  console.log(`Dimensions: ${width}x${height}`);
  console.log(`Using raw mode: ${raw ? 'Yes' : 'No'} (for more natural-looking images)`);

  try {
    // Start the prediction
    const startResponse = await axios.post(
      "https://api.replicate.com/v1/predictions",
      {
        version: "c986c3b93d0bd0a2eac6eb0a44defa7a4de19125425bbd142fe3a3c28b02fe89", // flux-1.1-pro-ultra version
        input: {
          prompt,
          negative_prompt,
          width,
          height,
          num_inference_steps,
          guidance_scale,
          raw, // Use the raw parameter from options
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    const predictionId = startResponse.data.id;
    console.log(`Prediction started with ID: ${predictionId}`);

    // Poll for completion
    let prediction = startResponse.data;
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      console.log(`Current status: ${prediction.status}. Waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pollResponse = await axios.get(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      );
      prediction = pollResponse.data;
    }

    if (prediction.status === "failed") {
      throw new Error(`Prediction failed: ${prediction.error}`);
    }

    // Get the generated image URL
    const imageUrl = prediction.output;
    console.log(`Image generated successfully. Downloading from: ${imageUrl}`);

    // Download the image
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return Buffer.from(imageResponse.data);
  } catch (error) {
    console.error('Error generating image with Replicate:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Process an image buffer with Sharp and save it to disk
 * @param {Buffer} imageBuffer - The image buffer to process
 * @param {string} outputPath - The path to save the processed image
 * @param {object} options - Sharp processing options
 * @returns {Promise<string>} - A promise that resolves to the saved file path
 */
async function processAndSaveImage(imageBuffer, outputPath, options = {}) {
  const {
    format = 'png',
    quality = 100,
    resize = null,
  } = options;

  try {
    console.log(`Processing image with Sharp...`);

    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // Create Sharp instance
    let sharpInstance = sharp(imageBuffer);

    // Apply resize if specified
    if (resize) {
      sharpInstance = sharpInstance.resize(resize.width, resize.height, {
        fit: resize.fit || 'contain',
        background: resize.background || { r: 255, g: 255, b: 255, alpha: 1 }
      });
    }

    // Apply format-specific options
    if (format === 'png') {
      sharpInstance = sharpInstance.png({ quality });
    } else if (format === 'jpeg' || format === 'jpg') {
      sharpInstance = sharpInstance.jpeg({ quality });
    } else if (format === 'webp') {
      sharpInstance = sharpInstance.webp({ quality });
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Make sure the output path has the correct extension
    const fileExt = path.extname(outputPath).toLowerCase().slice(1);
    if (fileExt !== format) {
      outputPath = outputPath.replace(/\.[^/.]+$/, '') + '.' + format;
    }

    // Save the image to disk
    await sharpInstance.toFile(outputPath);
    console.log(`Image saved successfully to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error('Error processing image with Sharp:', error);
    throw error;
  }
}

/**
 * Main function to generate and save an image based on a prompt
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  // Default values
  let prompt = "A futuristic city in the clouds with floating buildings and flying vehicles";
  let negativePrompt = "";
  let outputPath = path.join(__dirname, '../output', `image-${Date.now()}.png`);
  let width = null;
  let height = null;
  let format = 'png';
  let aspectRatio = null;
  let rawMode = true; // Default to true for more natural-looking images

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && i + 1 < args.length) {
      prompt = args[i + 1];
      i++;
    } else if (args[i] === '--negative-prompt' && i + 1 < args.length) {
      negativePrompt = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    } else if (args[i] === '--width' && i + 1 < args.length) {
      width = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--height' && i + 1 < args.length) {
      height = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--format' && i + 1 < args.length) {
      format = args[i + 1];
      i++;
    } else if (args[i] === '--aspect-ratio' && i + 1 < args.length) {
      aspectRatio = args[i + 1];
      i++;
    } else if (args[i] === '--raw' && i + 1 < args.length) {
      rawMode = args[i + 1].toLowerCase() === 'true';
      i++;
    } else if (args[i] === '--help') {
      console.log(`
Usage: node generate-image.js [options]

Options:
  --prompt <text>                 Prompt text for image generation
  --negative-prompt <text>        Negative prompt to specify what to avoid
  --width <number>                Width of the generated image (default: 2752)
  --height <number>               Height of the generated image (default: 1536)
  --aspect-ratio <ratio>          Predefined aspect ratio (16:9, 2:3, 3:2, 1:1)
                                  Overrides width/height if specified
  --raw <true|false>              Use raw mode for more natural-looking images (default: true)
  --output <path>                 Output path for the generated image
  --format <png|jpg|webp>         Output format (default: png)
  --help                          Show this help message

Examples:
  node generate-image.js --prompt "Cyberpunk city" --aspect-ratio 16:9
  node generate-image.js --prompt "Character portrait" --aspect-ratio 2:3
      `);
      process.exit(0);
    }
  }

  // Default aspect ratio options if dimensions aren't specified
  const aspectRatioOptions = {
    // Use downtown-overview.png resolution as default (16:9 aspect ratio)
    default: { width: 2752, height: 1536 },
    // Portrait (2:3)
    portrait: { width: 1024, height: 1536 },
    // Landscape (3:2)
    landscape: { width: 1536, height: 1024 },
    // Square (1:1)
    square: { width: 1536, height: 1536 },
    // Widescreen (16:9)
    widescreen: { width: 2752, height: 1536 }
  };

  try {
    // Handle dimension calculations
    let dimensionOptions = {};

    // If aspect ratio is provided, use the predefined dimensions
    if (aspectRatio) {
      // Parse common aspect ratio formats
      if (aspectRatio === '16:9' || aspectRatio === '16/9') {
        dimensionOptions = aspectRatioOptions.widescreen;
      } else if (aspectRatio === '2:3' || aspectRatio === '2/3') {
        dimensionOptions = aspectRatioOptions.portrait;
      } else if (aspectRatio === '3:2' || aspectRatio === '3/2') {
        dimensionOptions = aspectRatioOptions.landscape;
      } else if (aspectRatio === '1:1' || aspectRatio === '1/1') {
        dimensionOptions = aspectRatioOptions.square;
      } else {
        // Try to parse custom aspect ratios like "4:3"
        const parts = aspectRatio.split(/[:\/]/);
        if (parts.length === 2) {
          const ratioWidth = parseFloat(parts[0]);
          const ratioHeight = parseFloat(parts[1]);
          if (!isNaN(ratioWidth) && !isNaN(ratioHeight) && ratioWidth > 0 && ratioHeight > 0) {
            // Use the default width and calculate height based on the ratio
            const baseWidth = 2752; // Use the downtown-overview.png width as base
            const calculatedHeight = Math.floor(baseWidth * (ratioHeight / ratioWidth));
            dimensionOptions = { width: baseWidth, height: calculatedHeight };
          } else {
            console.warn(`Invalid aspect ratio format: ${aspectRatio}. Using default.`);
            dimensionOptions = aspectRatioOptions.default;
          }
        } else {
          console.warn(`Unrecognized aspect ratio: ${aspectRatio}. Using default.`);
          dimensionOptions = aspectRatioOptions.default;
        }
      }
    }
    // If both dimensions are provided, use them
    else if (width && height) {
      dimensionOptions = { width, height };
    }
    // If only width is provided, calculate height for a reasonable aspect ratio (16:9)
    else if (width && !height) {
      dimensionOptions = { width, height: Math.floor(width * 9/16) };
    }
    // If only height is provided, calculate width for a reasonable aspect ratio (16:9)
    else if (!width && height) {
      dimensionOptions = { width: Math.floor(height * 16/9), height };
    }
    // If neither is provided, use default 16:9 aspect ratio
    else {
      dimensionOptions = aspectRatioOptions.default;
    }

    // Generate the image
    const imageBuffer = await generateImageWithReplicate(prompt, {
      ...dimensionOptions,
      negative_prompt: negativePrompt,
      raw: rawMode
    });

    // Process and save the image
    const savedPath = await processAndSaveImage(imageBuffer, outputPath, {
      format,
      quality: 100,
    });

    console.log(`✅ Image generation complete! Saved to: ${savedPath}`);
  } catch (error) {
    console.error('❌ Failed to generate or save image:', error);
    process.exit(1);
  }
}

// Run the script
main();
