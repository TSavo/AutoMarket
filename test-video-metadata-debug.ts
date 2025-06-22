/**
 * Debug video metadata extraction - NO API CALLS
 */

async function testVideoMetadataExtraction() {
  console.log('🔍 Testing video metadata extraction locally...');
  
  // Use an existing video file from previous tests
  const existingVideoPath = 'C:\\Users\\T\\AppData\\Local\\Temp\\fal-img2vid-1750619823639.mp4';
  
  // Import what we need
  const fs = require('fs');
  const { SmartAssetFactory } = await import('./src/media/assets/SmartAssetFactory');
  
  // Check if the file exists
  if (!fs.existsSync(existingVideoPath)) {
    console.log('❌ Video file not found. Let\'s check temp directory...');
    
    // List temp files
    const os = require('os');
    const path = require('path');
    const tempDir = os.tmpdir();
    
    console.log(`📁 Temp directory: ${tempDir}`);
    
    try {
      const files = fs.readdirSync(tempDir).filter((f: string) => f.includes('fal-img2vid') && f.endsWith('.mp4'));
      console.log(`🎬 Found ${files.length} fal video files:`);
      files.forEach((file: string) => {
        const fullPath = path.join(tempDir, file);
        const stats = fs.statSync(fullPath);
        console.log(`   ${file} - ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      if (files.length > 0) {
        const testPath = path.join(tempDir, files[0]);
        console.log(`\n🎯 Testing with: ${testPath}`);
        await testVideoFile(testPath);
      } else {
        console.log('❌ No fal video files found');
      }
    } catch (error) {
      console.log(`❌ Error reading temp directory: ${error.message}`);
    }
    
    return;
  }
  
  await testVideoFile(existingVideoPath);
}

async function testVideoFile(videoPath: string) {
  const fs = require('fs');
  const { SmartAssetFactory } = await import('./src/media/assets/SmartAssetFactory');
  
  console.log(`\n🔍 Testing video file: ${videoPath}`);
  
  // Check file stats
  const stats = fs.statSync(videoPath);
  console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📅 Created: ${stats.birthtime}`);
  console.log(`📝 Modified: ${stats.mtime}`);
  
  try {
    console.log('\n📦 Loading with SmartAssetFactory...');
    const smartAsset = SmartAssetFactory.load(videoPath);
    console.log(`✅ SmartAsset created: ${smartAsset.constructor.name}`);
    
    console.log('\n🎬 Converting to Video...');
    const video = await (smartAsset as any).asVideo();
    console.log(`✅ Video object created: ${video.constructor.name}`);
    
    console.log('\n📋 Video metadata:');
    console.log(`   isValid: ${video.isValid()}`);
    console.log(`   data length: ${video.data?.length || 'undefined'}`);
    console.log(`   metadata keys: ${Object.keys(video.metadata || {})}`);
    
    // Try to get dimensions and duration
    try {
      const dimensions = video.getDimensions();
      console.log(`   dimensions: ${JSON.stringify(dimensions)}`);
    } catch (error) {
      console.log(`   dimensions error: ${error.message}`);
    }
    
    try {
      const duration = video.getDuration();
      console.log(`   duration: ${duration}s`);
    } catch (error) {
      console.log(`   duration error: ${error.message}`);
    }
    
    // Check specific metadata properties
    console.log('\n🔧 Raw metadata inspection:');
    if (video.metadata) {
      Object.keys(video.metadata).forEach(key => {
        console.log(`   ${key}: ${video.metadata[key]}`);
      });
    } else {
      console.log('   metadata is null/undefined');
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`🔍 Stack: ${error.stack}`);
  }
}

// Run the test
testVideoMetadataExtraction().catch(console.error);
