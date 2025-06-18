#!/usr/bin/env node

/**
 * Test script to verify async role casting works
 */

import { MP4Asset } from './src/media/assets/types';

async function testAsyncRoleCasting() {
  console.log('🧪 Testing Async Role Casting...\n');

  try {
    // Create a mock MP4 asset
    const mockVideoData = Buffer.from('fake mp4 video data');
    const videoAsset = new MP4Asset(mockVideoData, {
      format: 'mp4',
      duration: 60,
      hasAudio: true
    });

    console.log('📝 Created MP4 asset with mock data');

    // Test async speech casting
    console.log('🎤 Testing asSpeech() casting...');
    const speech = await videoAsset.asSpeech();
    console.log('✅ Successfully cast to Speech:', speech.toString());

    // Test async audio casting
    console.log('🔊 Testing asAudio() casting...');
    const audio = await videoAsset.asAudio();
    console.log('✅ Successfully cast to Audio:', audio.toString());

    // Test async video casting
    console.log('📹 Testing asVideo() casting...');
    const video = await videoAsset.asVideo();
    console.log('✅ Successfully cast to Video:', video.toString());

    // Test capability checks
    console.log('\n🔍 Checking capabilities:');
    console.log('  - Can play speech role:', videoAsset.canPlaySpeechRole());
    console.log('  - Can play audio role:', videoAsset.canPlayAudioRole());
    console.log('  - Can play video role:', videoAsset.canPlayVideoRole());

    console.log('\n🎉 All async role casting tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAsyncRoleCasting();
