#!/usr/bin/env node

/**
 * Simple test script for FFMPEG service
 * Tests the REST API endpoints directly
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const SERVICE_URL = 'http://localhost:8006';
const TEST_VIDEO_PATH = path.join(__dirname, 'test-video.mp4');

async function testFFMPEGService() {
  console.log('🎬 Testing FFMPEG Service...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${SERVICE_URL}/health`);
      console.log('✅ Health check passed');
      console.log('📊 Service info:', {
        status: healthResponse.data.data.status,
        version: healthResponse.data.data.version,
        ffmpegVersion: healthResponse.data.data.ffmpegVersion,
        uptime: healthResponse.data.data.uptime
      });
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      console.log('💡 Make sure the service is running: docker-compose up -d');
      return;
    }

    // Test 2: Service Info
    console.log('\n2. Testing service info endpoint...');
    try {
      const infoResponse = await axios.get(`${SERVICE_URL}/`);
      console.log('✅ Service info retrieved');
      console.log('📋 Endpoints:', infoResponse.data.endpoints);
    } catch (error) {
      console.error('❌ Service info failed:', error.message);
    }

    // Test 3: Audio Extraction (if test video exists)
    if (fs.existsSync(TEST_VIDEO_PATH)) {
      console.log('\n3. Testing audio extraction...');
      try {
        const formData = new FormData();
        formData.append('video', fs.createReadStream(TEST_VIDEO_PATH));
        formData.append('outputFormat', 'wav');
        formData.append('sampleRate', '44100');
        formData.append('channels', '2');

        const extractResponse = await axios.post(
          `${SERVICE_URL}/video/extractAudio`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 60000 // 1 minute timeout
          }
        );

        if (extractResponse.data.success) {
          console.log('✅ Audio extraction successful');
          console.log('📊 Result:', {
            filename: extractResponse.data.data.filename,
            format: extractResponse.data.data.format,
            duration: extractResponse.data.data.metadata.duration,
            sampleRate: extractResponse.data.data.metadata.sampleRate,
            channels: extractResponse.data.data.metadata.channels,
            size: extractResponse.data.data.metadata.size,
            processingTime: extractResponse.data.data.processingTime
          });
        } else {
          console.error('❌ Audio extraction failed:', extractResponse.data.error);
        }
      } catch (error) {
        console.error('❌ Audio extraction request failed:', error.message);
        if (error.response?.data) {
          console.error('📋 Error details:', error.response.data);
        }
      }
    } else {
      console.log('\n3. Skipping audio extraction test - no test video found');
      console.log(`💡 To test audio extraction, place a video file at: ${TEST_VIDEO_PATH}`);
    }

    // Test 4: Detailed Health Check
    console.log('\n4. Testing detailed health endpoint...');
    try {
      const detailedHealthResponse = await axios.get(`${SERVICE_URL}/health/detailed`);
      console.log('✅ Detailed health check passed');
      console.log('📊 System info:', {
        ffmpegVersion: detailedHealthResponse.data.data.ffmpeg.version,
        nodeVersion: detailedHealthResponse.data.data.system.nodeVersion,
        platform: detailedHealthResponse.data.data.system.platform,
        memory: detailedHealthResponse.data.data.system.memory
      });
    } catch (error) {
      console.error('❌ Detailed health check failed:', error.message);
    }

    console.log('\n🎉 Service test completed!');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Create a simple test video if it doesn't exist
function createTestVideo() {
  if (!fs.existsSync(TEST_VIDEO_PATH)) {
    console.log('📹 Creating simple test video...');
    
    // This is a minimal MP4 file header - not a real video but enough for testing
    const minimalMp4 = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
      0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31
    ]);
    
    try {
      fs.writeFileSync(TEST_VIDEO_PATH, minimalMp4);
      console.log('✅ Test video created (minimal MP4 header)');
      console.log('💡 For real testing, replace with an actual video file');
    } catch (error) {
      console.warn('⚠️ Could not create test video:', error.message);
    }
  }
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
FFMPEG Service Test Script

Usage:
  node test-service.js [options]

Options:
  --create-test-video    Create a minimal test video file
  --help, -h            Show this help message

Examples:
  node test-service.js                    # Run all tests
  node test-service.js --create-test-video # Create test video and run tests
`);
    process.exit(0);
  }

  if (args.includes('--create-test-video')) {
    createTestVideo();
  }

  testFFMPEGService()
    .then(() => {
      console.log('\n✅ All tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testFFMPEGService };
