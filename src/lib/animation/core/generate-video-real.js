const { fal } = require('@fal-ai/client');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Generate a video using FramePack and save it to a specified location
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

    console.log('API request ID:', result.requestId);
    console.log('Video generation complete!');

    // Get the video URL from the result
    console.log('API response data:', JSON.stringify(result.data, null, 2));

    // Check different possible response formats
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
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node generate-video-real.js <input-image-path> <prompt> <output-video-path>');
    process.exit(1);
  }

  const inputImagePath = args[0];
  const prompt = args[1];
  const outputVideoPath = args[2];

  try {
    await generateAndSaveVideo(inputImagePath, prompt, outputVideoPath);
    console.log('Video generation completed successfully!');
  } catch (error) {
    console.error('Error generating video:', error);
    process.exit(1);
  }
}

// Run the script
main();
