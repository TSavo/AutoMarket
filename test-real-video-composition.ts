/**
 * Real Video Composition Test
 * 
 * Tests video composition with actual video files:
 * - Base: 300-million-job-massacre-goldman-sachs-avatar.mp4
 * - Overlay: overlay.webm
 */

import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import fs from 'fs';
import path from 'path';

async function testRealVideoComposition() {
  console.log('🎬 Testing Real Video Composition...\n');

  try {
    // Initialize API client
    console.log('📦 Initializing API client...');
    const apiClient = new FFMPEGAPIClient({
      baseUrl: 'http://localhost:8006',
      timeout: 300000 // 5 minutes for video processing
    });

    // Check service health
    console.log('🔌 Checking service health...');
    const health = await apiClient.checkHealth();
    console.log('✅ Service healthy:', health.status);

    // Prepare video files
    const baseVideoPath = path.join(__dirname, '300-million-job-massacre-goldman-sachs-avatar.mp4');
    const overlayVideoPath = path.join(__dirname, 'overlay.webm');

    console.log('📹 Checking video files...');
    console.log('Base video:', baseVideoPath);
    console.log('Overlay video:', overlayVideoPath);

    if (!fs.existsSync(baseVideoPath)) {
      throw new Error(`Base video not found: ${baseVideoPath}`);
    }
    if (!fs.existsSync(overlayVideoPath)) {
      throw new Error(`Overlay video not found: ${overlayVideoPath}`);
    }

    console.log('✅ Both video files found');

    // Get video metadata first
    console.log('\n📊 Getting video metadata...');
    try {
      const baseMetadata = await apiClient.getVideoMetadata(baseVideoPath);
      console.log('📹 Base video metadata:', {
        dimensions: `${baseMetadata.width}x${baseMetadata.height}`,
        duration: `${baseMetadata.duration}s`,
        framerate: baseMetadata.framerate
      });

      const overlayMetadata = await apiClient.getVideoMetadata(overlayVideoPath);
      console.log('🎭 Overlay video metadata:', {
        dimensions: `${overlayMetadata.width}x${overlayMetadata.height}`,
        duration: `${overlayMetadata.duration}s`,
        framerate: overlayMetadata.framerate
      });
    } catch (metadataError) {
      console.log('⚠️  Metadata extraction failed:', metadataError.message);
      console.log('🔄 Continuing with composition anyway...');
    }

    // Test video composition
    console.log('\n🎬 Starting video composition...');
    console.log('⏳ This may take a while for large videos...');

    const startTime = Date.now();
    
    try {      const result = await apiClient.composeVideo(
        baseVideoPath,
        overlayVideoPath,
        {
          layout: 'overlay',
          overlayPosition: 'bottom-right',
          overlayScale: 0.25,
          overlayOpacity: 0.8,
          outputFormat: 'mp4',
          codec: 'libx264'
        }
      );

      const processingTime = Date.now() - startTime;
      
      console.log('\n🎉 Video composition completed successfully!');
      console.log('📊 Results:', {
        processingTime: `${processingTime}ms`,
        outputFile: result.filename,
        outputPath: result.outputPath,
        success: result.success
      });

      if (result.metadata) {
        console.log('📹 Output metadata:', {
          dimensions: `${result.metadata.width}x${result.metadata.height}`,
          duration: `${result.metadata.duration}s`,
          framerate: result.metadata.framerate,
          fileSize: `${Math.round(result.metadata.size / 1024 / 1024 * 100) / 100}MB`
        });
      }

      console.log('\n💡 You can find the composed video at:');
      console.log(`   📁 ${result.outputPath || result.filename}`);

    } catch (compositionError) {
      console.error('❌ Video composition failed:', compositionError.message);
      console.log('\n🔍 This might be due to:');
      console.log('   - Incompatible video formats');
      console.log('   - FFmpeg processing issues');
      console.log('   - File size or duration limits');
      console.log('   - Service timeout');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure the FFmpeg service is running:');
      console.log('   cd services/ffmpeg && npm run dev');
    }
  } finally {
    console.log('\n🏁 Video composition test finished');
  }
}

// Run the test
testRealVideoComposition().catch(console.error);
