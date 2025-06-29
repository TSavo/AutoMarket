/**
 * Test script to demonstrate UNIVERSAL ROLE COMPATIBILITY
 * 
 * This script demonstrates how ANY asset can be input to ANY model through
 * the asRole<T>() system, enabling seamless multi-modal AI workflows.
 * 
 * Key insight: Models use asRole<T>() to automatically convert inputs:
 * - TextAsset → ImageToVideoModel → Text→Image→Video pipeline  
 * - VideoAsset → AudioModel → Video→Audio extraction via FFmpeg
 * - AudioAsset → TextModel → Audio→Text transcription via Whisper
 */

import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';
import { Audio, Video, Text, Image } from './src/media/assets/roles';
import { VideoAsset, TextAsset } from './src/media/assets/types';
import * as path from 'path';

async function testCanPlayRole() {
  console.log('🧪 Testing UNIVERSAL ROLE COMPATIBILITY...\n');
  
  // Load test assets
  const videoPath = path.join(__dirname, 'test-videos', 'base.mp4');
  const textData = 'A beautiful sunset over mountains with golden light';
  console.log(`📁 Loading video from: ${videoPath}`);
  
  const videoAsset = await SmartAssetFactory.load<VideoAsset>(videoPath);
  const textAsset = TextAsset.fromString(textData);

  console.log(`✅ Loaded video asset: ${videoAsset.toString()}`);
  console.log(`✅ Created text asset: ${textAsset.toString()}\n`);

  // Test universal role compatibility
  console.log('🎯 UNIVERSAL COMPATIBILITY MATRIX:');
  console.log('📹 VideoAsset can play roles:');
  console.log(`  - Video role: ${videoAsset.canPlayRole(Video)} (identity)`);
  console.log(`  - Audio role: ${videoAsset.canPlayRole(Audio)} (FFmpeg extraction)`);
  console.log(`  - Image role: ${videoAsset.canPlayRole(Image)} (frame extraction)`);
  console.log(`  - Text role: ${videoAsset.canPlayRole(Text)} (OCR on frames)`);
  
  console.log('\n📝 TextAsset can play roles:');
  console.log(`  - Text role: ${textAsset.canPlayRole(Text)} (identity)`);
  console.log(`  - Audio role: ${textAsset.canPlayRole(Audio)} (TTS synthesis)`);
  console.log(`  - Image role: ${textAsset.canPlayRole(Image)} (text-to-image)`);
  console.log(`  - Video role: ${textAsset.canPlayRole(Video)} (text-to-video)`);

  console.log('\n🔄 Testing automatic role conversions:');
  try {
    // Identity transforms (same type)
    if (videoAsset.canPlayRole(Video)) {
      const video = await videoAsset.asRole(Video);
      console.log(`  ✅ Video → Video: ${video.toString()}`);
    }
    
    if (textAsset.canPlayRole(Text)) {
      const text = await textAsset.asRole(Text);
      console.log(`  ✅ Text → Text: ${text.toString()}`);
    }

    // Cross-modal conversions (when providers available)
    console.log('\n  🎨 Cross-modal conversions would work like:');
    console.log('    📹→🎵 Video → Audio (FFmpeg extraction)');
    console.log('    📝→🖼️  Text → Image (DALL-E, Midjourney)');
    console.log('    📝→🎵 Text → Audio (TTS synthesis)');
    console.log('    🖼️→📹 Image → Video (Runway, SVD)');
    
  } catch (error) {
    console.log(`  ⚠️ Role conversion test failed: ${error.message}`);
  }
  
  console.log('\n🌟 UNIVERSAL MODEL COMPATIBILITY:');
  console.log('   Any asset can be input to any model through asRole<T>():');
  console.log('   ');
  console.log('   // Text to Image-to-Video pipeline');
  console.log('   const video = await imageToVideoModel.transform(textAsset);');
  console.log('   // → textAsset.asRole(Image) → Image → Video');
  console.log('   ');
  console.log('   // Video to Audio extraction');
  console.log('   const audio = await audioModel.transform(videoAsset);');
  console.log('   // → videoAsset.asRole(Audio) → Audio processing');
  console.log('   ');
  console.log('   // Audio to Text transcription');
  console.log('   const transcript = await textModel.transform(audioAsset);');
  console.log('   // → audioAsset.asRole(Text) → Text processing');

  console.log('\n🚀 KEY BENEFITS:');
  console.log('  1. Universal input compatibility - ANY asset → ANY model');
  console.log('  2. Automatic conversion pipelines via provider system');
  console.log('  3. Type-safe transformations with full TypeScript support');
  console.log('  4. Composable multi-modal AI workflows');
  console.log('  5. Provider abstraction - users don\'t need conversion details');
  console.log('  6. Future-proof - new providers enhance ALL assets');

  console.log('\n🎯 This creates a truly universal multi-modal AI system!');
}

if (require.main === module) {
  testCanPlayRole().catch(console.error);
}

export { testCanPlayRole };
