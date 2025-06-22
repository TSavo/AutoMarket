/**
 * Debug SmartAssetFactory video loading process
 */

async function testSmartAssetFactorySteps() {
  console.log('🔍 Testing SmartAssetFactory step by step...');
  
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
  console.log(`🎬 Testing: ${videoPath}`);
  
  try {
    // Step 1: Check if we can directly use FFmpegService
    console.log('\n1️⃣ Testing direct FFmpegService metadata extraction...');
    
    const { FFmpegService } = await import('./src/media/services/FFmpegService');
    const ffmpegService = new FFmpegService();
    
    const directMetadata = await ffmpegService.getVideoMetadata(videoPath);
    console.log('✅ Direct FFmpeg metadata:');
    console.log(`   Duration: ${directMetadata.duration}s`);
    console.log(`   Dimensions: ${directMetadata.width}x${directMetadata.height}`);
    console.log(`   Frame rate: ${directMetadata.frameRate}fps`);
    console.log(`   Codec: ${directMetadata.codec}`);
    
    // Step 2: Test SmartAssetFactory loading
    console.log('\n2️⃣ Testing SmartAssetFactory loading...');
    
    const { SmartAssetFactory } = await import('./src/media/assets/SmartAssetFactory');
    const smartAsset = SmartAssetFactory.load(videoPath);
    
    console.log(`✅ SmartAsset created: ${smartAsset.constructor.name}`);
    console.log(`   Metadata keys: ${Object.keys(smartAsset.metadata || {})}`);
    console.log(`   Raw metadata:`, smartAsset.metadata);
    
    // Step 3: Test asVideo conversion
    console.log('\n3️⃣ Testing asVideo() conversion...');
    
    const video = await (smartAsset as any).asVideo();
    console.log(`✅ Video created: ${video.constructor.name}`);
    console.log(`   Video data length: ${video.data?.length}`);
    console.log(`   Video format: ${video.format}`);
    console.log(`   Video metadata keys: ${Object.keys(video.metadata || {})}`);
      // Step 4: Check getVideoMetadata method from the asset
    console.log('\n4️⃣ Testing getVideoMetadata() from asset...');
    
    if (typeof (smartAsset as any).getVideoMetadata === 'function') {
      const assetVideoMetadata = (smartAsset as any).getVideoMetadata();
      console.log('✅ Asset video metadata:');
      console.log(assetVideoMetadata);
    } else {
      console.log('❌ getVideoMetadata method not found on asset');
    }
    
    // Step 5: Try to manually set metadata and see if it works
    console.log('\n5️⃣ Testing manual metadata injection...');
    
    // Create a new video with the proper metadata
    const { Video } = await import('./src/media/assets/roles');
    const manualVideo = new Video(
      video.data,
      'mp4',
      {
        format: 'mp4',
        duration: directMetadata.duration,
        width: directMetadata.width,
        height: directMetadata.height,
        frameRate: directMetadata.frameRate,
        codec: directMetadata.codec,
        hasAudio: true,
        fileSize: video.data.length
      }
    );
    
    console.log('✅ Manual video with injected metadata:');
    console.log(`   Duration: ${manualVideo.getDuration()}s`);
    console.log(`   Dimensions: ${JSON.stringify(manualVideo.getDimensions())}`);
    console.log(`   Frame rate: ${manualVideo.getFrameRate()}fps`);
    console.log(`   Has audio: ${manualVideo.hasAudio()}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(`🔍 Stack: ${error.stack}`);
  }
}

// Run the test
testSmartAssetFactorySteps().catch(console.error);
