/**
 * Test Video Metadata Extraction (No Expensive API Calls)
 * 
 * Tests the Video role's ability to automatically extract metadata
 * from local video files using ffprobe - saves you money!
 */

import { Video } from './src/media/assets/roles';
import * as fs from 'fs';

async function testVideoMetadataExtraction() {
  console.log('🎬 Testing Video Metadata Extraction (Local Only - No API costs!)\n');

  // Find an existing video file in the project
  const possibleVideos = [
    './example-5-intro-outro-result.mp4',
    './example-6-multi-intro-outro-result.mp4', 
    './test-example1-direct.mp4',
    './output.mp4',
    './test.mp4'
  ];

  let testVideoPath: string | null = null;
  for (const videoPath of possibleVideos) {
    if (fs.existsSync(videoPath)) {
      testVideoPath = videoPath;
      console.log(`✅ Found test video: ${videoPath}`);
      break;
    }
  }

  if (!testVideoPath) {
    // Search for any .mp4 files
    const files = fs.readdirSync('.');
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    
    if (mp4Files.length > 0) {
      testVideoPath = `./${mp4Files[0]}`;
      console.log(`✅ Found video file: ${testVideoPath}`);
    } else {
      console.log('⚠️ No .mp4 files found. Skipping tests.');
      return;
    }
  }

  try {
    console.log('\n1️⃣ Creating Video from file path...');
    const video = Video.fromFile(testVideoPath);
    
    console.log('📊 Video object created');
    console.log('   📁 Source file:', testVideoPath);
    console.log('   💾 Buffer size:', video.data.length, 'bytes');
    console.log('   🎭 Format:', video.format);

    console.log('\n2️⃣ Testing metadata extraction (first call)...');
    console.time('Metadata extraction');
    
    const duration1 = video.getDuration();
    const dimensions1 = video.getDimensions();
    const frameRate = video.getFrameRate();
    const hasAudio = video.hasAudio();
    
    console.timeEnd('Metadata extraction');
    
    console.log(`   ⏱️  Duration: ${duration1} seconds`);
    console.log(`   📐 Dimensions: ${dimensions1.width}x${dimensions1.height}`);
    console.log(`   🎞️  Frame rate: ${frameRate} fps`);
    console.log(`   🔊 Has audio: ${hasAudio}`);

    console.log('\n3️⃣ Testing metadata caching (second call)...');
    console.time('Cached metadata access');
    
    const duration2 = video.getDuration();
    const dimensions2 = video.getDimensions();
    
    console.timeEnd('Cached metadata access');
    
    console.log(`   ⏱️  Duration (cached): ${duration2} seconds`);
    console.log(`   📐 Dimensions (cached): ${dimensions2.width}x${dimensions2.height}`);

    console.log('\n4️⃣ Testing Video string representation...');
    console.log(`   📄 toString(): ${video.toString()}`);

    console.log('\n5️⃣ Waiting for async metadata extraction to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    const finalDuration = video.getDuration();
    const finalDimensions = video.getDimensions();
    
    console.log(`   ⏱️  Final duration: ${finalDuration} seconds`);
    console.log(`   📐 Final dimensions: ${finalDimensions.width}x${finalDimensions.height}`);
    console.log(`   📄 Final toString(): ${video.toString()}`);

    console.log('\n✅ Video metadata extraction test complete!');
    console.log('💰 No API costs incurred - all testing done locally!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Quick test of video creation methods
async function testVideoCreationMethods() {
  console.log('\n🔧 Testing Video Creation Methods\n');
  
  try {
    // Test with mock data
    const mockBuffer = Buffer.alloc(1024);
    const mockVideo = new Video(mockBuffer, 'mp4', { format: 'mp4' });
    
    console.log('📊 Mock video created');
    console.log('   💾 Buffer size:', mockBuffer.length, 'bytes');
    console.log('   🎭 Format:', mockVideo.format);
    console.log('   ⏱️  Duration (mock):', mockVideo.getDuration());
    console.log('   📄 toString():', mockVideo.toString());
    
  } catch (error) {
    console.log('⚠️ Expected error with mock video:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  (async () => {
    try {
      await testVideoMetadataExtraction();
      await testVideoCreationMethods();
    } catch (error) {
      console.error('Test suite failed:', error);
    }
  })();
}

export { testVideoMetadataExtraction, testVideoCreationMethods };
