/**
 * Test Enhanced SmartAssetFactory with FFmpeg Integration
 */

async function testEnhancedSmartAssetFactory() {
  console.log('🔧 Testing Enhanced SmartAssetFactory with FFmpeg Integration...');
  
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  // Find the video file
  const tempDir = os.tmpdir();
  const files = fs.readdirSync(tempDir).filter((f: string) => f.includes('fal-img2vid') && f.endsWith('.mp4'));
  
  if (files.length === 0) {
    console.log('❌ No video files found');
    return;
  }
  
  const videoPath = path.join(tempDir, files[0]);
  console.log(`🎬 Testing enhanced loading: ${videoPath}`);
  
  try {
    console.log('\n1️⃣ Testing enhanced SmartAssetFactory.load()...');
    
    const { SmartAssetFactory } = await import('./src/media/assets/SmartAssetFactory');
    
    console.time('Enhanced metadata extraction');
    const smartAsset = await SmartAssetFactory.load(videoPath);
    console.timeEnd('Enhanced metadata extraction');
    
    console.log(`✅ Enhanced SmartAsset created: ${smartAsset.constructor.name}`);
    console.log(`   Metadata keys: ${Object.keys(smartAsset.metadata || {})}`);
    console.log(`   Enhanced metadata:`, smartAsset.metadata);
    
    console.log('\n2️⃣ Testing enhanced asVideo() conversion...');
    
    const video = await (smartAsset as any).asVideo();
    console.log(`✅ Enhanced Video created: ${video.constructor.name}`);
    
    console.log('\n3️⃣ Testing video methods with enhanced metadata...');
    
    const duration = video.getDuration();
    const dimensions = video.getDimensions();
    const frameRate = video.getFrameRate();
    const hasAudio = video.hasAudio();
    
    console.log(`✅ Enhanced video metadata results:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Dimensions: ${JSON.stringify(dimensions)}`);
    console.log(`   Frame rate: ${frameRate}fps`);
    console.log(`   Has audio: ${hasAudio}`);
    console.log(`   String representation: ${video.toString()}`);
    
    if (duration && dimensions && frameRate) {
      console.log(`\n🎉 SUCCESS! SmartAssetFactory now automatically extracts video metadata!`);
    } else {
      console.log(`\n❌ FAILED! Metadata still not extracted properly.`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`🔍 Stack: ${error.stack}`);
  }
}

// Run the test
testEnhancedSmartAssetFactory().catch(console.error);
