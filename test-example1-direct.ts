/**
 * Test   // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');mple 1 filter generation and run FFmpeg directly
 */

import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';
import { Video } from './src/media/assets/roles';

async function testExample1Direct() {
  console.log('🧪 Testing Example 1 Filter Generation');
  
  // Create the filter model without API client (no network calls)
  const filter = new FFMPEGVideoFilterModel();

  // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');

  console.log('\n📹 Loaded test videos');  // Generate the filter complex for Example 1 with transparency and proper audio
  const filterComplex = filter
    .compose(baseVideo)
    .overlay(overlay1, {
      position: 'top-right',
      width: '25%',
      height: '25%',
      opacity: 0.8,
      startTime: 2,
      duration: 10,
      colorKey: '0x000000', // Make black transparent
      colorKeySimilarity: 0.30,
      colorKeyBlend: 0.10    })
    .preview(); // No need for manual replacement anymore - fixed in the model

  console.log('\n🔍 Generated filter complex:');
  console.log(filterComplex);  // Build the complete FFmpeg command with proper audio mixing
  const outputFile = 'test-example1-direct.mp4';
  const ffmpegCmd = [
    'ffmpeg',
    '-i', './test-videos/base.mp4',
    '-i', './test-videos/overlay1.webm',
    '-y',
    '-filter_complex', `"${filterComplex}"`,
    '-map', '[final_video]',
    '-map', '[mixed_audio]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    outputFile
  ].join(' ');

  console.log('\n🎬 Complete FFmpeg command:');
  console.log(ffmpegCmd);

  return ffmpegCmd;
}

// Run the test
if (require.main === module) {
  testExample1Direct().then(cmd => {
    console.log('\n📋 Copy and run this command:');
    console.log(cmd);
  }).catch(console.error);
}

export { testExample1Direct };
