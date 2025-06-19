/**
 * Simple Video Composition API Test
 */

import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';

async function testVideoCompositionAPI() {
  console.log('🎬 Starting Video Composition API Test...\n');

  try {
    // Initialize API client
    console.log('📦 Initializing API client...');
    const apiClient = new FFMPEGAPIClient({
      baseUrl: 'http://localhost:8006',
      timeout: 60000
    });

    // Test connection via health check
    console.log('🔌 Testing connection to FFmpeg service...');
    try {
      const health = await apiClient.checkHealth();
      console.log('✅ Connected to FFmpeg service');
      console.log('✅ Health check passed:', health.status);
      console.log('📊 Service info:', {
        version: health.version,
        uptime: health.uptime,
        activeJobs: health.activeJobs
      });
    } catch (error) {
      console.error('❌ FFmpeg service not available:', error.message);
      console.log('⚠️  Make sure the FFmpeg service is running:');
      console.log('💡 cd services/ffmpeg && npm run dev');
      return;
    }

    console.log('\n🎥 Video composition test would require actual video files.');
    console.log('✅ API client and service communication verified!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\n🏁 Test execution finished');
  }
}

// Run the test
testVideoCompositionAPI().catch(console.error);
