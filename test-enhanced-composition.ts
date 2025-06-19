/**
 * Test Video Composition with Transparency and Timing
 * 
 * Tests the enhanced video composition with:
 * - Alpha channel preservation for transparency
 * - Timing controls for overlay duration
 */

import { FFMPEGVideoComposerModel } from './src/media/models/FFMPEGVideoComposerModel';
import { FFMPEGDockerService } from './src/media/services/FFMPEGDockerService';
import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import fs from 'fs';
import path from 'path';

async function testEnhancedVideoComposition() {
  console.log('🎬 Testing Enhanced Video Composition with Transparency and Timing...\n');

  try {
    // Initialize services
    const dockerService = new FFMPEGDockerService();
    const apiClient = new FFMPEGAPIClient({
      baseUrl: 'http://localhost:8006',
      timeout: 300000 // 5 minutes for processing
    });

    // Initialize composer model
    const composer = new FFMPEGVideoComposerModel({
      dockerService,
      apiClient
    });

    // Check service health
    const isAvailable = await composer.isAvailable();
    if (!isAvailable) {
      throw new Error('FFMPEG service is not available');
    }
    console.log('✅ Service is healthy and available');

    // Prepare file paths
    const baseVideoPath = path.resolve('./300-million-job-massacre-goldman-sachs-avatar.mp4');
    const overlayVideoPath = path.resolve('./overlay.webm');

    console.log('📁 Base video:', baseVideoPath);
    console.log('📁 Overlay video:', overlayVideoPath);

    // Verify files exist
    if (!fs.existsSync(baseVideoPath)) {
      throw new Error('Base video file not found');
    }    if (!fs.existsSync(overlayVideoPath)) {
      throw new Error('Overlay video file not found');
    }
    
    console.log('✅ Both video files found');

    // Load assets using smart asset factory
    console.log('\n📦 Loading assets with smart asset factory...');
    const baseVideoAsset = SmartAssetFactory.load(baseVideoPath);
    const overlayVideoAsset = SmartAssetFactory.load(overlayVideoPath);
    console.log('✅ Assets loaded successfully');

    // Test composition with timing controls using the model
    console.log('\n🎥 Starting enhanced video composition...');
    console.log('⏱️  Overlay will appear from 5 seconds for 25 seconds duration');
    
    const startTime = Date.now();    // Use the model with proper options
    const result = await composer.transform(
      baseVideoAsset,
      overlayVideoAsset,
      {
        overlayStartTime: 5,     // Start at 5 seconds
        overlayDuration: 25,     // Show for 25 seconds
        position: 'bottom-right',
        opacity: 1.0,            // Full opacity (transparency comes from WebM alpha)
        overlayWidth: '25%',     // 25% of base video width
        overlayHeight: '25%',    // 25% of base video height
        outputFormat: 'mp4',
        codec: 'h264_nvenc'         // Use CPU codec temporarily to test filter logic
      }
    );

    const endTime = Date.now();
    const processingTime = (endTime - startTime) / 1000;

    console.log('\n🎉 Enhanced composition completed!');
    console.log('📊 Results:');
    console.log(`   ⏱️  Processing time: ${processingTime.toFixed(1)} seconds`);
    console.log(`   � Resolution: ${result.metadata.resolution}`);
    console.log(`   ⏳ Duration: ${result.metadata.duration.toFixed(1)} seconds`);
    console.log(`   📐 Aspect ratio: ${result.metadata.aspectRatio}`);
    console.log(`   🎬 Framerate: ${result.metadata.framerate} fps`);

    console.log('\n✨ New Features Applied:');
    console.log('   🔍 Alpha channel preservation for transparency');
    console.log(`   ⏱️  Overlay timing: appears from ${result.metadata.overlayInfo.startTime}s for ${result.metadata.overlayInfo.duration}s`);
    console.log(`   📍 Position: ${result.metadata.overlayInfo.position}`);
    console.log(`   📏 Overlay size: ${result.metadata.overlayInfo.finalSize.width}x${result.metadata.overlayInfo.finalSize.height}`);
    console.log('   🎯 Enhanced pixel format for web compatibility');
    console.log('   🚀 Fast start enabled for streaming');    console.log('\n💡 You can now view the enhanced composition with proper transparency and timing!');
    console.log('💾 The composed video is available in the result.composedVideo asset');

    // Save the composed video to disk
    console.log('\n💾 Saving composed video to disk...');
    const outputPath = path.resolve('./result-enhanced-composition.mp4');
    
    try {
      fs.writeFileSync(outputPath, result.composedVideo.data);
      const fileSizeMB = (result.composedVideo.data.length / (1024 * 1024)).toFixed(2);
      console.log('✅ Video saved successfully!');
      console.log(`   📁 Output path: ${outputPath}`);
      console.log(`   📊 File size: ${fileSizeMB} MB`);
    } catch (saveError) {
      console.error('❌ Failed to save video to disk:', saveError.message);
    }

  } catch (error) {
    console.error('❌ Enhanced composition failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the FFmpeg service is running:');
      console.log('   cd services/ffmpeg && npm run dev');
    }
  }
}

// Run the enhanced test
testEnhancedVideoComposition().catch(console.error);
