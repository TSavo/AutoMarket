/**
 * Test Example 2 filter generation and run FFmpeg directly
 */

import { FFMPEGVideoFilterModel } from './src/media/models/FFMPEGVideoFilterModel';
import { Video } from './src/media/assets/roles';

async function testExample2Direct() {
  console.log('🧪 Testing Example 2 Filter Generation');
  
  // Create the filter model without API client (no network calls)
  const filter = new FFMPEGVideoFilterModel();

  // Load sample videos
  const baseVideo = Video.fromFile('./test-videos/base.mp4');
  const overlay1 = Video.fromFile('./test-videos/overlay1.webm');
  const overlay2 = Video.fromFile('./test-videos/overlay2.webm');
  const overlay3 = Video.fromFile('./test-videos/overlay3.webm');

  console.log('\n📹 Loaded test videos');

  // Generate the filter complex for Example 2: Multiple Overlays with Individual Configs
  const filterComplex = filter
    .compose(baseVideo)
    .overlay(overlay1, {
      position: 'top-left',
      width: '30%',
      height: '30%',
      opacity: 0.9,
      startTime: 5,
      duration: 15,
      colorKey: '0x000000',
      colorKeySimilarity: 0.30,
      colorKeyBlend: 0.10
    })
    .overlay(overlay2, {
      position: 'bottom-right', 
      width: '40%',
      height: '40%',
      opacity: 0.7,
      startTime: 10,
      duration: 20,
      colorKey: '0x000000',
      colorKeySimilarity: 0.30,
      colorKeyBlend: 0.10
    })
    .overlay(overlay3, {
      position: 'center',
      width: '20%',
      height: '20%',
      opacity: 0.5,
      startTime: 15,
      duration: 10,
      colorKey: '0x000000',
      colorKeySimilarity: 0.30,
      colorKeyBlend: 0.10    })
    .preview(); // No need for manual replacement anymore - fixed in the model

  console.log('\n🔍 Generated filter complex:');
  console.log(filterComplex);

  // Build the complete FFmpeg command with proper audio mixing
  const outputFile = 'test-example2-direct.mp4';
  const ffmpegCmd = [
    'ffmpeg',
    '-i', './test-videos/base.mp4',
    '-i', './test-videos/overlay1.webm',
    '-i', './test-videos/overlay2.webm',
    '-i', './test-videos/overlay3.webm',
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
  testExample2Direct().then(cmd => {
    console.log('\n📋 Copy and run this command:');
    console.log(cmd);
  }).catch(console.error);
}

export { testExample2Direct };
