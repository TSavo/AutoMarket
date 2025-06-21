/**
 * Test just concatenation without overlays to isolate the issue
 */

import { FFMPEGLocalClient } from './src/media/providers/docker/ffmpeg/FFMPEGLocalClient';
import { FFMPEGVideoFilterModel } from './src/media/providers/docker/ffmpeg/FFMPEGVideoFilterModel';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function testJustConcatenation() {
  console.log('🔧 Testing JUST concatenation without overlays...\n');

  try {
    const localClient = new FFMPEGLocalClient({ timeout: 120000 });
    
    // Load test videos
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

    // Test JUST concatenation - NO overlays
    const model = new FFMPEGVideoFilterModel(undefined, localClient);
    
    const composition = model
      .compose(baseVideo)
      .prepend(introVideo);  // Just concatenation
    
    const filterComplex = composition.preview();
    console.log('✅ Generated filter complex (no overlays):');
    console.log(filterComplex);
    
    // Execute
    console.log('\n🎬 Executing just concatenation...');
    try {
      const result = await composition.execute();
      console.log('✅ Concatenation success! Size:', result.length, 'bytes');
      
      const outputPath = path.join(process.cwd(), 'test-output-concat-only.mp4');
      fs.writeFileSync(outputPath, result);
      console.log('💾 Saved to:', outputPath);
      
    } catch (error) {
      console.error('❌ Concatenation failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testJustConcatenation().catch(console.error);
