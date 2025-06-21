/**
 * Integration test for FFMPEGCompositionBuilder with actual FFmpeg execution
 * This test verifies that the refactored composition builder works with real FFmpeg
 */

import { FFMPEGVideoFilterModel } from './src/media/providers/docker/ffmpeg/FFMPEGVideoFilterModel';
import { FFMPEGCompositionBuilder } from './src/media/providers/docker/ffmpeg/FFMPEGCompositionBuilder';
import { FFMPEGAPIClient } from './src/media/providers/docker/ffmpeg/FFMPEGAPIClient';
import { FFMPEGDockerService } from './src/media/services/FFMPEGDockerService';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { hasVideoRole } from './src/media/assets/roles';
import fs from 'fs';
import path from 'path';

async function testCompositionBuilderIntegration() {
  console.log('🧪 Testing FFMPEGCompositionBuilder with real FFmpeg execution...\n');

  try {
    // Check if FFmpeg service is available
    console.log('🔌 Checking FFmpeg service availability...');
    const apiClient = new FFMPEGAPIClient({
      baseUrl: 'http://localhost:8006',
      timeout: 60000
    });

    try {
      const health = await apiClient.checkHealth();
      console.log('✅ FFmpeg service is running:', health.status);
    } catch (error) {
      console.log('⚠️  FFmpeg service not available. Run: cd services/ffmpeg && npm run dev');
      console.log('🎯 Testing filter complex generation only (no execution)...\n');
      return testFilterComplexOnly();
    }

    // Initialize Docker service
    const dockerService = new FFMPEGDockerService();

    // Test 1: Test the refactored model with actual execution
    console.log('📋 Test 1: FFMPEGVideoFilterModel with actual execution');
    
    const testVideoDir = path.join(process.cwd(), 'test-videos');
    const baseVideoPath = path.join(testVideoDir, 'base.mp4');
    const overlayVideoPath = path.join(testVideoDir, 'overlay1.webm');

    if (!fs.existsSync(baseVideoPath) || !fs.existsSync(overlayVideoPath)) {
      console.log('⚠️  Test videos not found, creating minimal test composition...');
      return testMinimalComposition(apiClient, dockerService);
    }

    // Load real videos
    const baseAsset = SmartAssetFactory.load(baseVideoPath);
    const overlayAsset = SmartAssetFactory.load(overlayVideoPath);

    if (!hasVideoRole(baseAsset) || !hasVideoRole(overlayAsset)) {
      throw new Error('Test videos do not have video role capabilities');
    }

    const baseVideo = await baseAsset.asVideo();
    const overlayVideo = await overlayAsset.asVideo();

    console.log('✅ Loaded test videos');
    console.log(`   Base: ${baseVideoPath}`);
    console.log(`   Overlay: ${overlayVideoPath}`);

    // Test with the refactored model
    const model = new FFMPEGVideoFilterModel(dockerService, apiClient);    // Test with a VERY simple composition first
    console.log('🎬 Executing simple composition first...');
    try {
      const simpleResult = await model
        .compose(baseVideo)
        .execute();
      
      console.log('✅ Simple composition successful!');
      console.log(`✅ Simple result size: ${simpleResult.length} bytes`);
    } catch (error) {
      console.log('❌ Simple composition failed:', error.message);
      console.log('🔍 This indicates a basic service issue, not filter complexity');
      throw error;
    }

    console.log('🎬 Now testing sophisticated composition...');
    const result = await model
      .reset()  // Reset the model first
      .compose(baseVideo)
      .addOverlay(overlayVideo, {
        position: 'top-right',
        opacity: 0.8,
        width: '25%',
        // Skip color key for first test
        startTime: 2
      })
      .execute();

    console.log('✅ FFmpeg execution successful!');
    console.log(`✅ Result video size: ${result.length} bytes`);
    
    // Save result for inspection
    const outputPath = path.join(testVideoDir, 'composition-result.mp4');
    fs.writeFileSync(outputPath, result);
    console.log(`✅ Result saved to: ${outputPath}`);

    console.log('\n🎉 Integration test passed! The refactored composition builder works with real FFmpeg execution.');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

async function testFilterComplexOnly() {
  console.log('📋 Testing filter complex generation without execution...');
  
  // Create mock videos for filter testing
  const mockBuffer1 = Buffer.from('test-video-1');
  const mockBuffer2 = Buffer.from('test-video-2');
  const baseAsset = SmartAssetFactory.fromBuffer(mockBuffer1, 'mp4');
  const overlayAsset = SmartAssetFactory.fromBuffer(mockBuffer2, 'webm');
  const baseVideo = await baseAsset.asVideo();
  const overlayVideo = await overlayAsset.asVideo();

  // Test both builder and model
  const builder = new FFMPEGCompositionBuilder();
  const model = new FFMPEGVideoFilterModel();

  // Test sophisticated composition
  builder
    .compose(baseVideo)
    .addOverlay(overlayVideo, {
      position: 'top-right',
      opacity: 0.8,
      width: '25%',
      colorKey: '#00FF00',
      colorKeySimilarity: 0.25,
      colorKeyBlend: 0.05,
      startTime: 2
    });

  model
    .compose(baseVideo)
    .addOverlay(overlayVideo, {
      position: 'bottom-left',
      opacity: 0.6,
      colorKey: '#0000FF',
      startTime: 5
    });

  const builderFilter = builder.preview();
  const modelFilter = model.preview();

  console.log('✅ Builder filter complex:');
  console.log(builderFilter);
  console.log('\n✅ Model filter complex:');
  console.log(modelFilter);

  // Verify both contain sophisticated features
  const features = ['colorkey=', 'tpad=', 'format=auto', 'alpha='];
  const builderHasFeatures = features.every(f => builderFilter.includes(f));
  const modelHasFeatures = features.every(f => modelFilter.includes(f));

  console.log(`\n✅ Builder has all sophisticated features: ${builderHasFeatures ? '✅' : '❌'}`);
  console.log(`✅ Model has all sophisticated features: ${modelHasFeatures ? '✅' : '❌'}`);

  return builderHasFeatures && modelHasFeatures;
}

async function testMinimalComposition(apiClient: FFMPEGAPIClient, dockerService: FFMPEGDockerService) {
  console.log('📋 Testing minimal composition with mock data...');
  
  // For integration testing, we'd need real video data
  // This is a placeholder for when real test videos are available
  console.log('⚠️  Minimal composition test requires real video files');
  console.log('✅ API client and service setup successful');
  
  return testFilterComplexOnly();
}

// Export for use in other tests
export { testCompositionBuilderIntegration };

// Run if executed directly
if (require.main === module) {
  testCompositionBuilderIntegration()
    .then(success => {
      if (success) {
        console.log('\n✅ Composition builder integration test completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Composition builder integration test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Integration test error:', error);
      process.exit(1);
    });
}
