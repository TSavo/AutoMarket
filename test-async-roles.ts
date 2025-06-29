#!/usr/bin/env node

/**
 * Test script to verify async role casting works
 */

import { VideoAsset } from './src/media/assets/types';
import { Audio, Video } from './src/media/assets/roles';

async function testAsyncRoleCasting() {
  console.log('🧪 Testing Async Role Casting...\n');

  try {
    // Create a mock Video asset
    const mockVideoData = Buffer.from('fake mp4 video data');
    const videoAsset = new VideoAsset(mockVideoData, {
      format: 'mp4',
      duration: 60,
      hasAudio: true
    });

    console.log('📝 Created MP4 asset with mock data');


    // Test async audio casting
    console.log('🔊 Testing asRole(Audio) casting...');
    const audio = await videoAsset.asRole(Audio);
    console.log('✅ Successfully cast to Audio:', audio.toString());

    // Test async video casting
    console.log('📹 Testing asRole(Video) casting...');
    const video = await videoAsset.asRole(Video);
    console.log('✅ Successfully cast to Video:', video.toString());

    // Test capability checks
    console.log('\n🔍 Checking capabilities:');
    console.log('  - Can play audio role:', videoAsset.canPlayRole(Audio));
    console.log('  - Can play video role:', videoAsset.canPlayRole(Video));

    console.log('\n🎉 All async role casting tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAsyncRoleCasting();
