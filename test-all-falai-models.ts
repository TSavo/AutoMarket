/**
 * Test All fal.ai Model Implementations
 * 
 * Complete test suite demonstrating all 5 model types implemented for fal.ai
 */

import { FalAiProvider } from './src/media/providers/falai/FalAiProvider';
import { Text, Image, Video, Audio } from './src/media/assets/roles';
import { SmartAssetFactory } from './src/media/assets/SmartAssetFactory';

async function testAllFalAiModels() {
  console.log('🚀 Testing ALL fal.ai Model Implementations');
  console.log('==============================================');

  // Configure fal.ai provider
  const provider = new FalAiProvider();
  await provider.configure({
    apiKey: process.env.FALAI_API_KEY || 'fal_demo_key',
    discovery: {
      openRouterApiKey: process.env.OPENROUTER_API_KEY, // For FREE model categorization
      cacheDir: './cache',
      maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  });

  if (!await provider.isAvailable()) {
    console.log('❌ fal.ai provider not available');
    return;
  }

  console.log('✅ fal.ai provider connected');

  try {
    // Test 1: Text-to-Image (FLUX Pro)
    console.log('\n🎨 Test 1: Text-to-Image Generation (FLUX Pro)');
    console.log('================================================');
    
    const textToImageModel = await provider.createTextToImageModel('fal-ai/flux-pro');
    console.log(`✅ Created model: ${textToImageModel.getDisplayName()}`);
    
    const promptText = Text.fromString('a futuristic cityscape at sunset with flying cars, cyberpunk style, highly detailed');
    console.log(`📝 Prompt: "${promptText.content}"`);
    
    const generatedImage = await textToImageModel.transform(promptText, {
      width: 1024,
      height: 1024,
      steps: 28,
      guidanceScale: 7.5,
      quality: 'high'
    });
    
    console.log(`✅ Generated image: ${generatedImage.getDimensions()?.width}x${generatedImage.getDimensions()?.height}, ${generatedImage.getHumanSize()}`);
    console.log(`📁 Saved to: ${generatedImage.metadata?.localPath}`);

    // Test 2: Text-to-Video (Runway Gen3)
    console.log('\n🎬 Test 2: Text-to-Video Generation (Runway Gen3)');
    console.log('=================================================');
    
    const textToVideoModel = await provider.createTextToVideoModel('fal-ai/runway-gen3');
    console.log(`✅ Created model: ${textToVideoModel.getDisplayName()}`);
    
    const videoPromptText = Text.fromString('a serene ocean wave crashing on a sandy beach, golden hour lighting, slow motion');
    console.log(`📝 Prompt: "${videoPromptText.content}"`);
    
    const generatedVideo = await textToVideoModel.transform(videoPromptText, {
      duration: 4,
      aspectRatio: '16:9',
      fps: 30,
      motionStrength: 0.7
    });
    
    console.log(`✅ Generated video: ${generatedVideo.getDuration()}s, ${JSON.stringify(generatedVideo.getDimensions())}`);
    console.log(`📁 Saved to: ${generatedVideo.metadata?.localPath}`);

    // Test 3: Image-to-Video (FramePack)
    console.log('\n🖼️→🎬 Test 3: Image-to-Video Animation (FramePack)');
    console.log('================================================');
    
    const imageToVideoModel = await provider.createImageToVideoModel('fal-ai/framepack');
    console.log(`✅ Created model: ${imageToVideoModel.getDisplayName()}`);
    
    console.log(`🔄 Using generated image from Test 1 as input...`);
    
    const animatedVideo = await imageToVideoModel.transform(generatedImage, {
      duration: 3,
      fps: 25,
      motionStrength: 0.5,
      loop: false,
      interpolationSteps: 8
    });
    
    console.log(`✅ Animated video: ${animatedVideo.getDuration()}s, ${JSON.stringify(animatedVideo.getDimensions())}`);
    console.log(`📁 Saved to: ${animatedVideo.metadata?.localPath}`);

    // Test 4: Video-to-Video (Face Swap/Enhancement)
    console.log('\n🎭 Test 4: Video-to-Video Processing (Enhancement)');
    console.log('=================================================');
    
    const videoToVideoModel = await provider.createVideoToVideoModel('fal-ai/video-enhance');
    console.log(`✅ Created model: ${videoToVideoModel.getDisplayName()}`);
    
    console.log(`🔄 Using generated video from Test 2 as input...`);
    
    const enhancedVideoResult = await videoToVideoModel.transform(generatedVideo, [], {
      outputQuality: 'high',
      outputResolution: '1920x1080',
      outputFormat: 'mp4',
      codec: 'libx264'
    });
    
    console.log(`✅ Enhanced video: ${enhancedVideoResult.composedVideo.getDuration()}s, resolution: ${enhancedVideoResult.metadata.resolution}`);
    console.log(`📊 Processing info: ${enhancedVideoResult.metadata.overlayInfo.count} overlays processed`);
    console.log(`📁 Saved to: ${enhancedVideoResult.composedVideo.metadata?.localPath}`);

    // Test 5: Text-to-Audio (XTTS-v2)
    console.log('\n🔊 Test 5: Text-to-Audio Generation (XTTS-v2)');
    console.log('=============================================');
    
    const textToAudioModel = await provider.createTextToAudioModel('fal-ai/xtts-v2');
    console.log(`✅ Created model: ${textToAudioModel.getDisplayName()}`);
    console.log(`🎤 Voices available: ${textToAudioModel.getAvailableVoices().join(', ')}`);
    console.log(`🔄 Voice cloning supported: ${textToAudioModel.supportsVoiceCloning()}`);
    console.log(`📝 Max text length: ${textToAudioModel.getMaxTextLength()} characters`);
    
    const speechText = Text.fromString('Welcome to AutoMarket, the future of AI-powered media generation. This audio was created using fal.ai and XTTS voice synthesis technology.');
    console.log(`📝 Text: "${speechText.content}"`);
    
    const generatedAudio = await textToAudioModel.transform(speechText, {
      voice: 'female_1',
      language: 'en',
      speed: 1.0,
      quality: 'high',
      format: 'wav'
    });
    
    console.log(`✅ Generated audio: ${generatedAudio.metadata?.duration}s, ${(generatedAudio.getSize() / 1024).toFixed(1)}KB`);
    console.log(`📁 Saved to: ${generatedAudio.metadata?.localPath}`);

    // Test 6: Image-to-Image (Real-ESRGAN Upscaling)
    console.log('\n🔍 Test 6: Image-to-Image Processing (Real-ESRGAN Upscaling)');
    console.log('===========================================================');
    
    const imageToImageModel = await provider.createImageToImageModel('fal-ai/real-esrgan');
    console.log(`✅ Created model: ${imageToImageModel.getDisplayName()}`);
    console.log(`🖼️  Formats supported: ${imageToImageModel.getSupportedFormats().join(', ')}`);
    
    console.log(`🔄 Using generated image from Test 1 as input for upscaling...`);
    
    const upscaledImage = await imageToImageModel.transform(generatedImage, {
      scale: 4, // 4x upscaling
      denoise: true,
      quality: 'high',
      format: 'png'
    });
    
    const originalDims = generatedImage.getDimensions();
    const upscaledDims = upscaledImage.getDimensions();
    console.log(`✅ Upscaled image: ${originalDims?.width}x${originalDims?.height} → ${upscaledDims?.width}x${upscaledDims?.height}`);
    console.log(`📈 Size increase: ${generatedImage.getHumanSize()} → ${upscaledImage.getHumanSize()}`);
    console.log(`📁 Saved to: ${upscaledImage.metadata?.localPath}`);

    // Summary
    console.log('\n🎉 ALL FALAAI MODEL TESTS COMPLETED!');
    console.log('===================================');
    console.log('✅ Text-to-Image: FLUX Pro generation');
    console.log('✅ Text-to-Video: Runway Gen3 generation');
    console.log('✅ Image-to-Video: FramePack animation');
    console.log('✅ Video-to-Video: Video enhancement');
    console.log('✅ Text-to-Audio: XTTS-v2 voice synthesis');
    console.log('✅ Image-to-Image: Real-ESRGAN upscaling');
    
    console.log('\n📊 Model Performance Summary:');
    console.log(`🎨 Generated ${upscaledDims?.width}x${upscaledDims?.height} image (${upscaledImage.getHumanSize()})`);
    console.log(`🎬 Generated ${generatedVideo.getDuration()}s video (${JSON.stringify(generatedVideo.getDimensions())})`);
    console.log(`🎭 Enhanced video to ${enhancedVideoResult.metadata.resolution}`);
    console.log(`🔊 Generated ${generatedAudio.metadata?.duration}s audio (${(generatedAudio.getSize() / 1024).toFixed(1)}KB)`);
    console.log(`🔍 Upscaled image by ${upscaledImage.getDimensions()?.width! / generatedImage.getDimensions()?.width!}x`);
    
    console.log('\n🎯 fal.ai Provider Status: FULLY OPERATIONAL');
    console.log('All 5+ model categories successfully implemented and tested!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  testAllFalAiModels().catch(console.error);
}

export { testAllFalAiModels };
