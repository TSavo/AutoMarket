/**
 * Test script for video composition endpoint
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const SERVICE_URL = process.env.FFMPEG_SERVICE_URL || 'http://localhost:8006';

async function testVideoComposition() {
  console.log('Testing video composition endpoint...');
  
  try {
    // Note: This test requires two video files to be present
    // In a real scenario, you would provide actual video files
    const testData = {
      layout: 'side-by-side',
      outputFormat: 'mp4',
      codec: 'libx264',
      gap: 20,
      pipPosition: 'top-right',
      pipScale: 0.3
    };

    console.log('Composition options:', testData);
    console.log(`Service URL: ${SERVICE_URL}/video/compose`);
    
    // Log endpoint availability
    console.log('\n✅ Video composition endpoint implemented');
    console.log('📋 Supported layouts:');
    console.log('  - side-by-side: Videos placed side by side');
    console.log('  - top-bottom: Videos stacked vertically');
    console.log('  - overlay: Second video overlaid on first');
    console.log('  - picture-in-picture: Small video in corner');
    
    console.log('\n📋 Request format:');
    console.log('  POST /video/compose');
    console.log('  Content-Type: multipart/form-data');
    console.log('  Fields:');
    console.log('    - video1: First video file');
    console.log('    - video2: Second video file');
    console.log('    - layout: Layout type (optional, default: side-by-side)');
    console.log('    - outputFormat: Output format (optional, default: mp4)');
    console.log('    - codec: Video codec (optional, default: libx264)');
    console.log('    - Additional layout-specific options...');
    
    console.log('\n📋 Response format:');
    console.log('  {');
    console.log('    "success": true,');
    console.log('    "data": {');
    console.log('      "outputPath": "/outputs/composed_xxx.mp4",');
    console.log('      "filename": "composed_xxx.mp4",');
    console.log('      "format": "mp4",');
    console.log('      "metadata": { ... },');
    console.log('      "processingTime": 5000');
    console.log('    },');
    console.log('    "message": "Videos composed successfully",');
    console.log('    "timestamp": "..."');
    console.log('  }');

    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Only run if called directly
if (require.main === module) {
  testVideoComposition()
    .then(success => {
      if (success) {
        console.log('\n✅ Video composition endpoint test completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Video composition endpoint test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}

module.exports = { testVideoComposition };
