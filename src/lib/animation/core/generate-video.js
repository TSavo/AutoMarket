const { generateAndSaveVideo } = require('./dist/simple-generate');

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node generate-video-ts.js <input-image-path> <prompt> <output-video-path>');
    process.exit(1);
  }
  
  const inputImagePath = args[0];
  const prompt = args[1];
  const outputVideoPath = args[2];
  
  try {
    console.log('Using TypeScript implementation...');
    await generateAndSaveVideo(inputImagePath, prompt, outputVideoPath);
    console.log('Video generation completed successfully!');
  } catch (error) {
    console.error('Error generating video:', error);
    process.exit(1);
  }
}

// Run the script
main();
