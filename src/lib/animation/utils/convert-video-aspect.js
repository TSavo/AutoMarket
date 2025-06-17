const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Convert a video from 9:16 to 3:4 aspect ratio by cropping black bars
 * @param {string} inputPath - Path to the input video
 * @param {string} outputPath - Path to save the output video
 * @param {boolean} overwrite - Whether to overwrite existing output file
 * @returns {boolean} - Success status
 */
function convertVideoAspect(inputPath, outputPath, overwrite = false) {
  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`Input file not found: ${inputPath}`);
      return false;
    }

    // If input and output paths are the same, we're overwriting by default
    if (inputPath === outputPath) {
      overwrite = true;
    }

    if (fs.existsSync(outputPath) && !overwrite) {
      console.log(`Output file already exists: ${outputPath}`);
      return false;
    }

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get video dimensions using ffprobe
    console.log(`Analyzing video: ${inputPath}`);
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`;
    const dimensions = execSync(probeCmd, { encoding: 'utf-8' }).trim().split('x');
    const width = parseInt(dimensions[0]);
    const height = parseInt(dimensions[1]);

    console.log(`Original dimensions: ${width}x${height}`);

    // Calculate crop values to convert from 9:16 to 3:4
    // For 9:16 to 3:4, we need to crop the top and bottom
    const targetRatio = 3 / 4;
    const currentRatio = width / height;

    let cropWidth, cropHeight, cropX, cropY;

    if (currentRatio < targetRatio) {
      // Video is too tall, crop top and bottom
      cropWidth = width;
      cropHeight = Math.round(width / targetRatio);
      cropX = 0;
      cropY = Math.round((height - cropHeight) / 2);
    } else {
      // Video is too wide, crop left and right
      cropHeight = height;
      cropWidth = Math.round(height * targetRatio);
      cropX = Math.round((width - cropWidth) / 2);
      cropY = 0;
    }

    console.log(`Cropping to: ${cropWidth}x${cropHeight} at position (${cropX},${cropY})`);

    // Use FFmpeg to crop the video
    const ffmpegCmd = `ffmpeg -i "${inputPath}" -vf "crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}" -c:v libx264 -crf 18 -preset medium -c:a copy "${outputPath}" -y`;

    console.log(`Converting video...`);
    execSync(ffmpegCmd, { encoding: 'utf-8' });

    console.log(`✅ Successfully converted video to 3:4 aspect ratio`);
    console.log(`   Saved to: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`Error converting video: ${error.message}`);
    return false;
  }
}

/**
 * Process a single video file
 */
function processVideo(inputPath, outputPath, overwrite = false) {
  console.log(`\n=== Processing video: ${path.basename(inputPath)} ===`);
  return convertVideoAspect(inputPath, outputPath, overwrite);
}

/**
 * Process all videos in a directory
 */
function processDirectory(inputDir, outputDir, overwrite = false) {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    return false;
  }

  // Check if we're overwriting files in the same directory
  const sameDirectory = inputDir === outputDir;
  if (sameDirectory) {
    console.log(`Processing and overwriting videos in ${inputDir}`);
    // When processing the same directory, we always overwrite
    overwrite = true;
  } else {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  const files = fs.readdirSync(inputDir);
  const videoFiles = files.filter(file => file.endsWith('.mp4'));

  console.log(`Found ${videoFiles.length} video files in ${inputDir}`);

  let successCount = 0;
  let failCount = 0;

  for (const videoFile of videoFiles) {
    const inputPath = path.join(inputDir, videoFile);
    const outputPath = path.join(outputDir, videoFile);

    const success = processVideo(inputPath, outputPath, overwrite);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Processing complete ===`);
  console.log(`Successfully processed: ${successCount} videos`);
  console.log(`Failed to process: ${failCount} videos`);

  return successCount > 0;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage:');
    console.log('  node convert-video-aspect.js <input-path> [output-path] [--overwrite]');
    console.log('  node convert-video-aspect.js --dir <input-dir> <output-dir> [--overwrite]');
    console.log('\nOptions:');
    console.log('  --dir        Process all videos in a directory');
    console.log('  --overwrite  Overwrite existing output files');
    console.log('  --help       Display this help message');
    return;
  }

  const overwrite = args.includes('--overwrite');

  if (args.includes('--dir')) {
    const dirIndex = args.indexOf('--dir');
    if (dirIndex + 2 >= args.length) {
      console.error('Error: Missing input or output directory');
      return;
    }

    const inputDir = args[dirIndex + 1];
    const outputDir = args[dirIndex + 2];

    processDirectory(inputDir, outputDir, overwrite);
  } else {
    const inputPath = args[0];
    // If no output path is provided, overwrite the input file
    const outputPath = args.length > 1 && !args[1].startsWith('--') ? args[1] : inputPath;

    processVideo(inputPath, outputPath, overwrite);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  convertVideoAspect,
  processVideo,
  processDirectory
};
