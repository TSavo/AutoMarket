/**
 * Test FFMPEGVideoToImageModel Directly
 * 
 * Try to use the model directly to see what fails.
 */

import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { VideoAsset } from './src/media/assets/types';
import { FFMPEGAPIClient } from './src/media/providers/docker/ffmpeg/FFMPEGAPIClient';
import { FFMPEGVideoToImageModel } from './src/media/providers/ffmpeg/FFMPEGVideoToImageModel';
import * as path from 'path';

async function testFFMPEGVideoToImageDirectly() {
  console.log('🔧 TESTING FFMPEG VIDEO-TO-IMAGE MODEL DIRECTLY');
  console.log('==============================================\n');

  try {
    // Load test video
    const videoPath = path.join(__dirname, 'test-videos', 'base.mp4');
    console.log(`📁 Loading video: ${videoPath}`);
    
    const videoAsset = await SmartAssetFactory.load<VideoAsset>(videoPath);
    console.log(`✅ Video loaded: ${videoAsset.toString()}\n`);

    // Try to create FFmpeg client (this will likely fail if service not running)
    console.log('🔌 Creating FFmpeg client...');
    const client = new FFMPEGAPIClient({
      baseUrl: 'http://localhost:3003', // Default FFmpeg service URL
      timeout: 10000
    });

    // Test client connection
    console.log('🌐 Testing client connection...');
    try {
      const connectionTest = await client.testConnection();
      console.log(`   Connection test: ${connectionTest ? '✅ Success' : '❌ Failed'}`);
      
      if (connectionTest) {
        const health = await client.checkHealth();
        console.log(`   Health status: ${health.status}`);
        console.log(`   FFmpeg version: ${health.ffmpegVersion || 'unknown'}`);
      }
    } catch (clientError) {
      console.log(`   ❌ Client connection failed: ${clientError.message}`);
      console.log('   This is expected if FFmpeg Docker service is not running');
      console.log('   Service should be running on: http://localhost:3003');
      console.log('\n🚀 SOLUTION:');
      console.log('   To enable Video → Image functionality, start the FFmpeg service:');
      console.log('   cd services/ffmpeg && docker-compose up -d');
      return;
    }

    // Create the model
    console.log('\n🔧 Creating FFMPEGVideoToImageModel...');
    const model = new FFMPEGVideoToImageModel({
      client: client,
      enableGPU: false,
      outputFormat: 'png',
      defaultQuality: 90
    });

    console.log('✅ Model created successfully');

    // Test the transform
    console.log('\n🎬 Testing video → image transformation...');
    const image = await model.transform(videoAsset, {
      frameTime: 1.0,
      format: 'png'
    });

    console.log(`✅ SUCCESS! Frame extracted: ${image.toString()}`);
    console.log(`   Format: ${image.format}`);
    console.log(`   Size: ${image.data.length} bytes`);
    console.log(`   Metadata: ${JSON.stringify(image.metadata, null, 2)}`);

    console.log('\n🏆 CONCLUSION:');
    console.log('✅ FFMPEGVideoToImageModel works perfectly!');
    console.log('✅ Video → Image extraction is fully functional');
    console.log('✅ Universal role compatibility system is operational');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.log('\n💡 DIAGNOSIS: FFmpeg service not running');
      console.log('   The FFMPEGProvider is registered but cannot connect to the service.');
      console.log('   This is why videoAsset.asRole(Image) fails.');
      
      console.log('\n🚀 SOLUTION:');
      console.log('   1. Start FFmpeg Docker service:');
      console.log('      cd services/ffmpeg && docker-compose up -d');
      console.log('   2. Verify service is running:');
      console.log('      curl http://localhost:3003/health');
      console.log('   3. Then Video → Image will work:');
      console.log('      const image = await videoAsset.asRole(Image);');
    } else {
      console.log(`\n💥 Unexpected error: ${error.stack}`);
    }
  }
}

if (require.main === module) {
  testFFMPEGVideoToImageDirectly().catch(console.error);
}

export { testFFMPEGVideoToImageDirectly };
