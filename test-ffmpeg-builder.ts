/**
 * Test script for FFMPEGCompositionBuilder
 * Tests the updated concatenation and overlay functionality with REAL videos
 */

import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { AssetLoader } from './src/media/assets/SmartAssetFactory';
import { Video } from './src/media/assets/roles';
import * as path from 'path';

// Helper function to load real video files using AssetLoader
function loadVideo(filename: string): Video {
  const filePath = path.join(__dirname, 'test-videos', filename);
  console.log(`📹 Loading real video: ${filename}`);
  
  const video = AssetLoader.fromFile<Video>(filePath);
  console.log(`✅ Loaded video: ${filename} (${video.data.length} bytes)`);
  
  return video;
}

console.log('🧪 Testing FFMPEGCompositionBuilder...\n');

// Test 1: Simple concatenation (2 videos)
console.log('=== Test 1: Simple Concatenation ===');
const builder1 = new FFMPEGCompositionBuilder();
const video1 = loadVideo('intro.mp4');
const video2 = loadVideo('base.mp4');

builder1
  .prepend(video1)
  .compose(video2);

console.log('Input videos:', builder1.getAllVideos().map((v: any) => v.metadata?.sourceFile?.split('\\').pop() || 'Unknown'));

try {
  const filter1 = builder1.buildFilterComplex();
  console.log('✅ Filter Complex Generated:');
  console.log(filter1);
} catch (error) {
  console.log('❌ Error:', error);
}

console.log('\n=== Test 2: Concatenation + Overlays ===');
const builder2 = new FFMPEGCompositionBuilder();
const intro = loadVideo('intro.mp4');
const main = loadVideo('base.mp4');
const outro = loadVideo('outro.mp4');
const overlay1 = loadVideo('overlay1.webm');
const overlay2 = loadVideo('overlay2.webm');

builder2
  .prepend(intro)
  .compose(main)
  .append(outro)
  .addOverlay(overlay1, {
    position: 'top-right',
    opacity: 0.8,
    width: '20%',
    height: '20%'
  })
  .addOverlay(overlay2, {
    position: 'bottom-left',
    opacity: 0.6,
    startTime: 2.0,
    colorKey: '#000000',
    colorKeySimilarity: 0.3
  });

console.log('Input videos:', builder2.getAllVideos().map((v: any) => v.metadata?.sourceFile?.split('\\').pop() || 'Unknown'));

try {
  const filter2 = builder2.buildFilterComplex();
  console.log('✅ Filter Complex Generated:');
  console.log(filter2);
} catch (error) {
  console.log('❌ Error:', error);
}

console.log('\n=== Test 3: Single Video + Overlays (No Concatenation) ===');
const builder3 = new FFMPEGCompositionBuilder();
const singleVideo = loadVideo('base.mp4');
const singleOverlay = loadVideo('overlay3.webm');

builder3
  .compose(singleVideo)
  .addOverlay(singleOverlay, {
    position: 'center',
    opacity: 0.5,
    width: '50%'
  });

console.log('Input videos:', builder3.getAllVideos().map((v: any) => v.metadata?.sourceFile?.split('\\').pop() || 'Unknown'));

try {
  const filter3 = builder3.buildFilterComplex();
  console.log('✅ Filter Complex Generated:');
  console.log(filter3);
} catch (error) {
  console.log('❌ Error:', error);
}

console.log('\n=== Test 4: Validation Test ===');
const builder4 = new FFMPEGCompositionBuilder();
const validation = builder4.validate();
console.log('Validation result (empty builder):', validation);

const testVideo = loadVideo('base.mp4');
builder4.compose(testVideo);
const validation2 = builder4.validate();
console.log('Validation result (with video):', validation2);

console.log('\n=== Test 5: REAL FFmpeg Execution ===');
const builder5 = new FFMPEGCompositionBuilder();
const realVideo1 = loadVideo('intro.mp4');
const realVideo2 = loadVideo('base.mp4');
const realOverlay = loadVideo('overlay1.webm');

builder5
  .prepend(realVideo1)
  .compose(realVideo2)
  .addOverlay(realOverlay, {
    position: 'top-right',
    opacity: 0.7,
    width: '25%',
    height: '25%'
  });

console.log('🎬 Testing with real FFmpeg...');
console.log('Input videos:', builder5.getAllVideos().map((v: any) => v.metadata?.sourceFile?.split('\\').pop() || 'Unknown'));

const filterComplex = builder5.buildFilterComplex();
console.log('Generated Filter Complex:');
console.log(filterComplex);

// Test the FFmpeg command generation
const inputVideos = builder5.getAllVideos();
const inputArgs: string[] = [];

// Add input arguments
inputVideos.forEach((video, index) => {
  inputArgs.push('-i', `input_${index}.mp4`); // We'll use placeholder names
});

// Add filter complex
inputArgs.push('-filter_complex', filterComplex);

// Add output mapping
inputArgs.push('-map', '[final_video]', '-map', '[mixed_audio]');

// Add output file and options
inputArgs.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', 'test_output.mp4', '-y');

console.log('\n🚀 FFmpeg Command that would be executed:');
console.log('ffmpeg', inputArgs.join(' '));

console.log('\n=== Test 6: FULL PIPELINE - Prepend + Append + 2 Black Color-Keyed Overlays ===');
const builder6 = new FFMPEGCompositionBuilder();
const fullIntro = loadVideo('intro.mp4');
const fullMain = loadVideo('base.mp4');
const fullOutro = loadVideo('outro.mp4');
const fullOverlay1 = loadVideo('overlay1.webm');
const fullOverlay2 = loadVideo('overlay2.webm');

builder6
  .prepend(fullIntro)
  .compose(fullMain)
  .append(fullOutro)
  .addOverlay(fullOverlay1, {
    position: 'top-right',
    opacity: 0.8,
    width: '25%',
    height: '25%',
    colorKey: '#000000',
    colorKeySimilarity: 0.3,
    colorKeyBlend: 0.1,
    startTime: 1.0
  })
  .addOverlay(fullOverlay2, {
    position: 'bottom-left',
    opacity: 0.7,
    width: '30%',
    height: '30%',
    colorKey: '#000000',
    colorKeySimilarity: 0.25,
    colorKeyBlend: 0.05,
    startTime: 2.5
  });

console.log('🎬 FULL PIPELINE TEST:');
console.log('Input videos:', builder6.getAllVideos().map((v: any) => v.metadata?.sourceFile?.split('\\').pop() || 'Unknown'));
console.log('Video order: [prepend] intro.mp4 → [main] base.mp4 → [append] outro.mp4 + [overlays] overlay1.webm + overlay2.webm');

try {
  const filter6 = builder6.buildFilterComplex();
  console.log('✅ Full Pipeline Filter Complex Generated:');
  console.log(filter6);
  
  // Generate actual FFmpeg command with real file paths
  const fullInputVideos = builder6.getAllVideos();
  const fullInputArgs: string[] = [];

  // Add input arguments with real video files
  fullInputVideos.forEach((video, index) => {
    const filename = video.metadata?.sourceFile?.split('\\').pop() || `input_${index}.mp4`;
    fullInputArgs.push('-i', `test-videos/${filename}`);
  });

  // Add filter complex
  fullInputArgs.push('-filter_complex', `"${filter6}"`);

  // Add output mapping
  fullInputArgs.push('-map', '[final_video]', '-map', '[mixed_audio]');
  // Add output options
  fullInputArgs.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', 'test_full_pipeline.mp4', '-y');

  console.log('\n🚀 Full Pipeline FFmpeg Command:');
  console.log('ffmpeg', fullInputArgs.join(' '));
  
} catch (error) {
  console.log('❌ Full Pipeline Error:', error);
}

console.log('\n🎉 All tests completed!');
