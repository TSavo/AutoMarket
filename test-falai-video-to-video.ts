/**
 * Test script for FalVideoToVideoModel with multiple videos (Face Swap)
 * 
 * This test demonstrates how to use the updated FalVideoToVideoModel
 * for face swap operations that require two videos.
 */

import { FalAiProvider } from './src/media/providers/falai/FalAiProvider';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole, Video } from './src/media/assets/roles';
import { MediaCapability } from './src/media/types/provider';
import * as path from 'path';
import * as fs from 'fs';

async function testFalVideoToVideoFaceSwap() {
  console.log('🎭 Testing FAL.ai Video-to-Video Face Swap...\n');

  try {
    // 1. Initialize FAL.ai provider
    console.log('📦 Initializing FAL.ai provider...');
    const provider = new FalAiProvider();
    await provider.configure({ 
      apiKey: process.env.FALAI_API_KEY!
    });
    console.log('✅ Provider configured');

    // 2. Load test videos
    console.log('\n🎥 Loading test videos...');
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    
    // Target video (where we want to put the new face)
    const targetVideoPath = path.join(testVideoDir, 'target-video.mp4');
    // Source video (contains the face we want to extract)
    const sourceVideoPath = path.join(testVideoDir, 'source-face.mp4');
    
    if (!fs.existsSync(targetVideoPath) || !fs.existsSync(sourceVideoPath)) {
      console.log('⚠️ Test videos not found. Please add:');
      console.log(`   - ${targetVideoPath} (target video)`);
      console.log(`   - ${sourceVideoPath} (source face video)`);
      return;
    }

    // Load videos using smart asset system
    const targetAsset = SmartAssetFactory.load(targetVideoPath);
    const sourceAsset = SmartAssetFactory.load(sourceVideoPath);

    if (!hasVideoRole(targetAsset) || !hasVideoRole(sourceAsset)) {
      throw new Error('Assets do not have video role capabilities');
    }

    const targetVideo = await targetAsset.asRole(Video);
    const sourceVideo = await sourceAsset.asRole(Video);

    console.log('✅ Loaded target video:', {
      duration: (targetVideo as Video).getDuration(),
      dimensions: (targetVideo as Video).getDimensions(),
      size: `${((targetVideo as Video).getSize() / 1024 / 1024).toFixed(2)} MB`
    });

    console.log('✅ Loaded source video:', {
      duration: (sourceVideo as Video).getDuration(),
      dimensions: (sourceVideo as Video).getDimensions(),
      size: `${((sourceVideo as Video).getSize() / 1024 / 1024).toFixed(2)} MB`
    });    // 3. Find available face swap models
    console.log('\n🔍 Finding face swap models...');
    const videoModels = provider.getModelsForCapability(MediaCapability.VIDEO_TO_VIDEO);
    const faceSwapModels = videoModels.filter(model => 
      model.id.toLowerCase().includes('face-swap') || 
      model.id.toLowerCase().includes('faceswap')
    );

    if (faceSwapModels.length === 0) {
      console.log('❌ No face swap models found');
      console.log('Available video models:', videoModels.map(m => m.id));
      return;
    }

    console.log('✅ Found face swap models:', faceSwapModels.map(m => m.id));

    // 4. Create face swap model
    const faceSwapModelId = faceSwapModels[0].id;
    console.log(`\n🤖 Creating face swap model: ${faceSwapModelId}...`);
    const faceSwapModel = await provider.createVideoToVideoModel(faceSwapModelId);
    console.log('✅ Model created');

    // 5. Test face swap with multiple videos
    console.log('\n🎭 Performing face swap...');
    console.log('   Target video: where to put the new face');
    console.log('   Source video: face to extract and apply');

    const startTime = Date.now();
    
    // Pass both videos - target first, source second
    const resultVideo = await faceSwapModel.transform([targetVideo, sourceVideo], {
      outputFormat: 'mp4',
      outputQuality: 'high',
      customParameters: {
        face_restore: true,
        background_enhance: true,
        similarity: 0.8 // How similar faces need to be for successful swap
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Face swap completed in ${(processingTime / 1000).toFixed(1)}s`);

    // 6. Save result
    const outputPath = path.join(process.cwd(), `test-face-swap-result-${Date.now()}.mp4`);
    fs.writeFileSync(outputPath, resultVideo.data);
    
    console.log(`💾 Result saved to: ${outputPath}`);
    console.log(`📊 Result info:`, {
      duration: resultVideo.getDuration(),
      dimensions: resultVideo.getDimensions(),
      size: `${(resultVideo.getSize() / 1024 / 1024).toFixed(2)} MB`
    });

    // 7. Test other video-to-video models
    console.log('\n🔍 Testing other video-to-video models...');
    const enhanceModels = videoModels.filter(model => 
      model.id.toLowerCase().includes('enhance') || 
      model.id.toLowerCase().includes('upscale')
    );

    if (enhanceModels.length > 0) {
      console.log('✅ Found enhancement models:', enhanceModels.map(m => m.id));
      
      const enhanceModelId = enhanceModels[0].id;
      console.log(`\n📈 Testing video enhancement: ${enhanceModelId}...`);
      
      const enhanceModel = await provider.createVideoToVideoModel(enhanceModelId);
      
      // Single video enhancement
      const enhancedVideo = await enhanceModel.transform(targetVideo, {
        outputFormat: 'mp4',
        outputQuality: 'ultra',
        outputResolution: '1920x1080'
      });
      
      const enhanceOutputPath = path.join(process.cwd(), `test-video-enhance-result-${Date.now()}.mp4`);
      fs.writeFileSync(enhanceOutputPath, enhancedVideo.data);
      console.log(`💾 Enhanced video saved to: ${enhanceOutputPath}`);
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
if (require.main === module) {
  testFalVideoToVideoFaceSwap().catch(console.error);
}

export { testFalVideoToVideoFaceSwap };
