#!/usr/bin/env node

/**
 * Test script to demonstrate the new Smart Asset Loading system
 */

import { AssetLoader } from './src/media/assets/SmartAssetFactory';

async function testSmartAssetLoading() {
  console.log('🧪 Testing Smart Asset Loading System...\n');

  try {
    // Test auto-detection for MP4 video
    console.log('🎬 Testing MP4 Video Auto-Detection...');
    const mp4Path = './300-million-job-massacre-goldman-sachs-avatar.mp4';
    
    // Method 1: AssetLoader.load() - Auto-detects format and applies appropriate mixins
    console.log('📋 Using AssetLoader.load() for automatic format detection');
    const videoAsset = AssetLoader.load(mp4Path);
    
    console.log('✅ Asset loaded:', {
      format: videoAsset.metadata.format,
      fileSize: `${(videoAsset.metadata.fileSize / 1024 / 1024).toFixed(1)}MB`,
      mimeType: videoAsset._mimeType,
      hasAudioRole: typeof videoAsset.asAudio === 'function',
      hasSpeechRole: typeof videoAsset.asSpeech === 'function', 
      hasVideoRole: typeof videoAsset.asVideo === 'function'
    });

    // Method 2: Type-safe loading with role guarantees
    console.log('\n📋 Using AssetLoader.fromFile<VideoAsset>() for type-safe loading');
    interface VideoAsset {
      asSpeech(): Promise<any>;
      asAudio(): Promise<any>;
      asVideo(): Promise<any>;
      isValid(): boolean;
    }
    
    const typedVideoAsset = AssetLoader.fromFile<VideoAsset>(mp4Path);
    console.log('✅ Type-safe asset loaded with guaranteed video roles');

    // Test the roles work properly
    console.log('\n🔧 Testing role functionality...');
    
    // Test speech conversion (should trigger FFmpeg)
    console.log('🎤 Converting to Speech (should use FFmpeg for MP4)...');
    const speech = await videoAsset.asSpeech();
    console.log(`✅ Speech conversion successful: ${speech.toString()}`);
    
    // Test audio conversion (should trigger FFmpeg)
    console.log('🔊 Converting to Audio (should use FFmpeg for MP4)...');
    const audio = await videoAsset.asAudio();
    console.log(`✅ Audio conversion successful: ${audio.toString()}`);
    
    // Test video conversion (direct, no FFmpeg needed)
    console.log('📹 Converting to Video (direct conversion)...');
    const video = await videoAsset.asVideo();
    console.log(`✅ Video conversion successful: ${video.toString()}`);

    // Test format info
    console.log('\n📊 Format Information:');
    const formatInfo = AssetLoader.getFormatInfo(mp4Path);
    console.log('✅ Format info:', formatInfo);
    
    // Test role support check
    const supportsVideo = AssetLoader.supportsRoles(mp4Path, ['video', 'speech', 'audio']);
    console.log(`✅ Supports video + speech + audio roles: ${supportsVideo}`);

    console.log('\n🎉 Smart Asset Loading test completed successfully!');
    console.log('\n💡 Key Benefits:');
    console.log('  ✅ Automatic format detection');
    console.log('  ✅ Intelligent role mixin application');
    console.log('  ✅ FFmpeg integration for video-to-audio conversion');
    console.log('  ✅ Type-safe loading with role guarantees');
    console.log('  ✅ No need for format-specific classes like MP4Asset');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testSmartAssetLoading();
