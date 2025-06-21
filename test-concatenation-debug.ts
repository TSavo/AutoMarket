/**
 * Simple test to debug concatenation with overlays
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { FFMPEGVideoFilterModel } from './src/media/providers/docker/ffmpeg/FFMPEGVideoFilterModel';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function testConcatenationDebug() {
  console.log('🔧 Testing concatenation with single overlay...\n');

  try {
    const localClient = new FFMPEGLocalClient({ timeout: 120000 });
    
    // Load test videos
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const overlayVideoPath = path.join(testVideoDir, 'overlay1.webm');
    const introVideoPath = path.join(testVideoDir, 'intro.mp4');
    const outroVideoPath = path.join(testVideoDir, 'outro.mp4');

    if (!fs.existsSync(baseVideoPath) || !fs.existsSync(overlayVideoPath) || !fs.existsSync(introVideoPath)) {
      console.log('❌ Required test videos not found');
      return;
    }    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const overlayAsset = SmartAssetFactory.load(overlayVideoPath);
    const introAsset = SmartAssetFactory.load(introVideoPath);
    const outroAsset = SmartAssetFactory.load(outroVideoPath);
    
    if (!hasVideoRole(baseAsset) || !hasVideoRole(overlayAsset) || !hasVideoRole(introAsset) || !hasVideoRole(outroAsset)) {
      throw new Error('Videos do not have video role capabilities');
    }
    
    const baseVideo = await baseAsset.asVideo();
    const overlayVideo = await overlayAsset.asVideo();
    const introVideo = await introAsset.asVideo();
    const outroVideo = await outroAsset.asVideo();
    console.log('✅ Loaded videos');

    // Test simple concatenation with single overlay
    const model = new FFMPEGVideoFilterModel(undefined, localClient);
    
    const composition = model
      .compose(baseVideo)
      .prepend(introVideo)  // This triggers concatenation path
      .addOverlay(overlayVideo, {
        position: 'top-right',
        opacity: 0.8,
        width: '25%',
        height: '25%',
        colorKey: '#000000',
        colorKeySimilarity: 0.3,
        colorKeyBlend: 0.1,
        startTime: 10
      }).addOverlay(overlayVideo, {
        position: 'bottom-right',
        opacity: 0.8,
        width: '25%',
        height: '25%',
        colorKey: '#000000',
        colorKeySimilarity: 0.3,
        colorKeyBlend: 0.1,
        startTime: 10
      }).append(outroVideo);
    
    const filterComplex = composition.preview();
    console.log('✅ Generated filter complex:');
    console.log(filterComplex);
    
    // Execute
    console.log('\n🎬 Executing simple concatenation with overlay...');
    try {
      const result = await composition.execute();
      console.log('✅ Success! Size:', result.length, 'bytes');
      
      const outputPath = path.join(process.cwd(), 'test-output-concat-debug.mp4');
      fs.writeFileSync(outputPath, result);
      console.log('💾 Saved to:', outputPath);
      
    } catch (error) {
      console.error('❌ Failed:', error.message);
      console.log('\n🔍 Error details:');
      if (error.message.includes('FFmpeg failed')) {
        const lines = error.message.split('\n');
        const errorLine = lines.find(line => line.includes('Error') || line.includes('Invalid') || line.includes('mismatch'));
        if (errorLine) {
          console.log('Key error:', errorLine);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testConcatenationDebug().catch(console.error);
