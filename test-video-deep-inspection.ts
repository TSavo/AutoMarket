/**
 * Deep video inspection - check what tools are available
 */

async function deepVideoInspection() {
  console.log('🔍 Deep video inspection...');
  
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Find the video file
  const tempDir = os.tmpdir();
  const files = fs.readdirSync(tempDir).filter((f: string) => f.includes('fal-img2vid') && f.endsWith('.mp4'));
  
  if (files.length === 0) {
    console.log('❌ No video files found');
    return;
  }
  
  const videoPath = path.join(tempDir, files[0]);
  console.log(`🎬 Testing: ${videoPath}`);
  
  // Test 1: Basic file analysis
  console.log('\n📊 File Analysis:');
  const stats = fs.statSync(videoPath);
  console.log(`   Size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  
  // Test 2: Check if ffprobe is available
  console.log('\n🔧 Checking ffprobe availability...');
  try {
    const { stdout } = await execAsync('ffprobe -version');
    console.log('✅ ffprobe is available');
    console.log(`   Version: ${stdout.split('\\n')[0]}`);
    
    // Test 3: Use ffprobe to analyze the video
    console.log('\n🎥 ffprobe analysis:');
    try {
      const { stdout: probeOutput } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`);
      const videoInfo = JSON.parse(probeOutput);
      
      console.log('✅ Video info extracted:');
      if (videoInfo.format) {
        console.log(`   Duration: ${videoInfo.format.duration}s`);
        console.log(`   Format: ${videoInfo.format.format_name}`);
        console.log(`   Size: ${videoInfo.format.size} bytes`);
      }
      
      if (videoInfo.streams) {
        videoInfo.streams.forEach((stream: any, index: number) => {
          console.log(`   Stream ${index}:`);
          console.log(`     Type: ${stream.codec_type}`);
          console.log(`     Codec: ${stream.codec_name}`);
          if (stream.width && stream.height) {
            console.log(`     Resolution: ${stream.width}x${stream.height}`);
          }
          if (stream.r_frame_rate) {
            console.log(`     Frame rate: ${stream.r_frame_rate}`);
          }
        });
      }
      
    } catch (probeError) {
      console.log(`❌ ffprobe analysis failed: ${probeError.message}`);
    }
    
  } catch (error) {
    console.log('❌ ffprobe not available');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 4: Check what the SmartAssetFactory is actually trying to do
  console.log('\n🏭 SmartAssetFactory deep dive...');
  try {
    const { SmartAssetFactory } = await import('./src/media/assets/SmartAssetFactory');
    
    // Check if there are any specific video processing imports
    console.log('📦 Loading SmartAsset...');
    const smartAsset = SmartAssetFactory.load(videoPath);
    
    console.log('🎬 Converting to video...');
    const video = await (smartAsset as any).asVideo();
    
    // Let's try to inspect the video processing code
    console.log('🔍 Checking video processing methods...');
    console.log(`   Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(video)).filter(name => name !== 'constructor')}`);
    
    // Check if there's a way to force metadata extraction
    if (typeof video.extractMetadata === 'function') {
      console.log('🔄 Trying to force metadata extraction...');
      await video.extractMetadata();
      console.log(`   After extraction - duration: ${video.metadata?.duration}`);
    }
    
  } catch (error) {
    console.log(`❌ SmartAssetFactory error: ${error.message}`);
  }
}

// Run the inspection
deepVideoInspection().catch(console.error);
