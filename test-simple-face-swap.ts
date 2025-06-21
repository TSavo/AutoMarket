/**
 * Simple test for FalVideoToVideoModel face swap functionality
 */

import { FalAiProvider } from './src/media/providers/falai/FalAiProvider';
import { AssetLoader } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import { MediaCapability } from './src/media/types/provider';
import * as path from 'path';
import * as fs from 'fs';

async function testFaceSwap() {
  console.log('🎭 Testing FAL.ai Face Swap...\n');

  if (!process.env.FALAI_API_KEY) {
    console.log('❌ FALAI_API_KEY environment variable is required');
    return;
  }

  try {
    // Initialize provider
    const provider = new FalAiProvider();
    await provider.configure({ apiKey: process.env.FALAI_API_KEY });
    console.log('✅ Provider configured');

    // Check for test videos
    const testDir = process.cwd();
    const targetPath = path.join(testDir, 'target-video.mp4');
    const sourcePath = path.join(testDir, 'source-video.mp4');

    if (!fs.existsSync(targetPath) || !fs.existsSync(sourcePath)) {
      console.log('⚠️ Please provide test videos:');
      console.log(`   - ${targetPath} (target video where face will be replaced)`);
      console.log(`   - ${sourcePath} (source video with face to extract)`);
      return;
    }

    // Load videos
    const targetAsset = AssetLoader.load(targetPath);
    const sourceAsset = AssetLoader.load(sourcePath);

    if (!hasVideoRole(targetAsset) || !hasVideoRole(sourceAsset)) {
      throw new Error('Videos do not have video capabilities');
    }

    const targetVideo = await targetAsset.asVideo();
    const sourceVideo = await sourceAsset.asVideo();
    console.log('✅ Videos loaded');

    // Find face swap models
    const models = provider.getModelsForCapability(MediaCapability.VIDEO_ANIMATION);
    const faceSwapModel = models.find(m => 
      m.id.includes('face-swap') || m.id.includes('faceswap')
    );

    if (!faceSwapModel) {
      console.log('❌ No face swap model found');
      console.log('Available models:', models.map(m => m.id));
      return;
    }

    console.log(`🤖 Using model: ${faceSwapModel.id}`);

    // Create model instance
    const model = await provider.createVideoToVideoModel(faceSwapModel.id);

    // Perform face swap
    console.log('🎭 Performing face swap...');
    const result = await model.transform([targetVideo, sourceVideo], {
      outputFormat: 'mp4',
      outputQuality: 'high',
      customParameters: {
        face_restore: true,
        background_enhance: true
      }
    });

    // Save result
    const outputPath = path.join(testDir, `face-swap-result-${Date.now()}.mp4`);
    fs.writeFileSync(outputPath, result.data);
    
    console.log(`✅ Face swap completed!`);
    console.log(`💾 Result saved to: ${outputPath}`);
    console.log(`📊 File size: ${(result.data.length / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testFaceSwap();
}

export { testFaceSwap };
