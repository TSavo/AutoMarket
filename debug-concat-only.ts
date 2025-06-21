/**
 * Debug concatenation-only video buffer order
 */

import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function debugConcatOnly() {
  console.log('🔧 Debugging concatenation-only buffer order...\n');

  try {
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');

    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const introAsset = SmartAssetFactory.load(introVideoPath);
    
    if (!hasVideoRole(baseAsset) || !hasVideoRole(introAsset)) {
      throw new Error('Videos do not have video role capabilities');
    }
    
    const baseVideo = await baseAsset.asVideo();
    const introVideo = await introAsset.asVideo();
    
    console.log('✅ Loaded videos');

    // Create builder with JUST concatenation
    const builder = new FFMPEGCompositionBuilder();
    
    builder
      .compose(baseVideo)
      .prepend(introVideo);  // NO overlays
    
    console.log('🎯 Video buffer order (concat only):');
    const videoBuffers = builder.getVideoBuffers();
    videoBuffers.forEach((buffer, i) => {
      console.log(`  Input ${i}: ${buffer.length} bytes`);
    });
    
    console.log('\n🎯 Concatenation videos:');
    const concatVideos = builder.getVideosForConcatenation();
    concatVideos.forEach((video, i) => {
      console.log(`  Index ${i}: ${video.data.length} bytes`);
    });
    
    console.log('\n🎯 Overlay videos:');
    const overlayVideos = builder.getOverlayVideos();
    console.log(`  Count: ${overlayVideos.length}`);
    
    console.log('\n🎯 State:');
    const state = builder.getState();
    console.log(`  prepend: ${state.prependVideos.length}`);
    console.log(`  main: ${state.videos.length}`);
    console.log(`  overlays: ${state.overlays.length}`);
    console.log(`  append: ${state.appendVideos.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugConcatOnly().catch(console.error);
