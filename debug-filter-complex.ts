/**
 * Debug test to print exact filter complex being generated
 */

import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function debugFilterComplex() {
  console.log('🔧 Debugging filter complex generation...\n');

  try {
    // Load test videos
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const overlayVideoPath = path.join(testVideoDir, 'overlay1.webm');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const overlayAsset = SmartAssetFactory.load(overlayVideoPath);
    const introAsset = SmartAssetFactory.load(introVideoPath);
    
    if (!hasVideoRole(baseAsset) || !hasVideoRole(overlayAsset) || !hasVideoRole(introAsset)) {
      throw new Error('Videos do not have video role capabilities');
    }
    
    const baseVideo = await baseAsset.asVideo();
    const overlayVideo = await overlayAsset.asVideo();
    const introVideo = await introAsset.asVideo();
    
    console.log('✅ Loaded videos');

    // Create builder
    const builder = new FFMPEGCompositionBuilder();
    
    builder
      .compose(baseVideo)
      .prepend(introVideo)
      .addOverlay(overlayVideo, {
        position: 'top-right',
        opacity: 0.8,
        width: '25%',
        colorKey: '#00FF00',
        colorKeySimilarity: 0.3,
        colorKeyBlend: 0.1,
        startTime: 2
      });
    
    console.log('🎯 Video buffer order:');
    const videoBuffers = builder.getVideoBuffers();
    console.log(`  Input 0: intro (${videoBuffers[0].length} bytes)`);
    console.log(`  Input 1: base (${videoBuffers[1].length} bytes)`);
    console.log(`  Input 2: overlay (${videoBuffers[2].length} bytes)`);
    
    console.log('\n🎯 All videos order:');
    const allVideos = builder.getAllVideos();
    allVideos.forEach((video, i) => {
      console.log(`  Index ${i}: ${video.data.length} bytes`);
    });
    
    console.log('\n🎯 Concatenation videos:');
    const concatVideos = builder.getVideosForConcatenation();
    concatVideos.forEach((video, i) => {
      console.log(`  Index ${i}: ${video.data.length} bytes`);
    });
    
    console.log('\n🎯 Overlay videos:');
    const overlayVideos = builder.getOverlayVideos();
    overlayVideos.forEach((video, i) => {
      console.log(`  Index ${i}: ${video.data.length} bytes`);
    });
    
    console.log('\n🎯 Generated filter complex:');
    const filterComplex = builder.buildFilterComplex();
    console.log(filterComplex);
    
    // Split into lines to analyze
    const lines = filterComplex.split(';\n');
    console.log('\n🎯 Filter lines breakdown:');
    lines.forEach((line, i) => {
      console.log(`  ${i + 1}: ${line}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugFilterComplex().catch(console.error);
