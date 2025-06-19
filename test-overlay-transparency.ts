/**
 * Test overlay functionality with transparency and timing
 */

import { FFMPEGVideoComposerModel } from './src/media/models/FFMPEGVideoComposerModel';
import { FFMPEGDockerService } from './src/media/services/FFMPEGDockerService';
import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import { Video } from './src/media/assets/roles';

async function testOverlayWithTransparency() {
  console.log('Testing overlay with transparency and timing...');
  
  // Create services
  const dockerService = new FFMPEGDockerService();
  const apiClient = new FFMPEGAPIClient('http://localhost:3001');
  
  const composer = new FFMPEGVideoComposerModel({
    dockerService,
    apiClient
  });
  
  try {
    // Check if service is available
    const isAvailable = await composer.isAvailable();
    if (!isAvailable) {
      console.log('❌ FFMPEG service is not available');
      return;
    }
    
    console.log('✅ FFMPEG service is available');
    
    // Test overlay composition with timing
    // Note: Replace these paths with actual video files for testing
    const baseVideoPath = './test-base-video.mp4';
    const overlayVideoPath = './test-overlay.webm'; // WebM with alpha channel
    
    const result = await composer.transform(
      baseVideoPath,
      overlayVideoPath,
      {
        overlayStartTime: 5, // Start overlay after 5 seconds
        overlayDuration: 10, // Show overlay for 10 seconds
        position: 'top-right',
        opacity: 0.8,
        overlayWidth: '30%',
        overlayHeight: '20%',
        outputFormat: 'mp4'
      }
    );
    
    console.log('✅ Video composition completed successfully');
    console.log('Result metadata:', result.metadata);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOverlayWithTransparency();
}

export { testOverlayWithTransparency };
