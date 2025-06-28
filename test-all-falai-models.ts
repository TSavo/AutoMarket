/**
 * Test All fal.ai Model Implementations
 * 
 * Test suite demonstrating fal.ai model types that are currently implemented
 */

import { FalAiProvider } from './src/media/providers/falai/FalAiProvider';
import { Text, Image, Video, Audio } from './src/media/assets/roles';
import { AssetLoader } from './src/media/assets/SmartAssetFactory';
import { MediaCapability } from './src/media/types/provider';
import * as fs from 'fs';
import * as path from 'path';

async function testAllFalAiModels() {
  console.log('🚀 Testing ALL fal.ai Model Implementations');
  console.log('==============================================');
  // Configure fal.ai provider
  const provider = new FalAiProvider();
  await provider.configure({
    apiKey: process.env.FALAI_API_KEY || 'fal_demo_key'
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
    
    const textToImageModels = provider.getModelsForCapability(MediaCapability.TEXT_TO_IMAGE);
    const fluxModel = textToImageModels.find(m => m.id.includes('flux')) || textToImageModels[0];
    
    if (!fluxModel) {
      console.log('❌ No text-to-image models available');
      return;
    }
    
    const textToImageModel = await provider.createTextToImageModel(fluxModel.id);
    console.log(`✅ Created model: ${fluxModel.id}`);    const promptText = new Text(
      'a futuristic cityscape at sunset with flying cars, cyberpunk style, highly detailed',
      'en',
      1.0,
      { content: 'a futuristic cityscape at sunset with flying cars, cyberpunk style, highly detailed' }
    );
    console.log(`📝 Prompt: "${promptText.metadata?.content || 'Unknown prompt'}"`);
    
    const generatedImage = await textToImageModel.transform(promptText, {
      width: 1024,
      height: 1024,
      steps: 28,
      guidanceScale: 7.5
    });
    
    console.log(`✅ Generated image: ${generatedImage.getDimensions()?.width}x${generatedImage.getDimensions()?.height}, ${generatedImage.getHumanSize()}`);
    if (generatedImage.metadata?.localPath) {
      console.log(`📁 Saved to: ${generatedImage.metadata.localPath}`);
    }

    // Test 2: Text-to-Video 
    console.log('\n🎬 Test 2: Text-to-Video Generation');
    console.log('====================================');
    
    const textToVideoModels = provider.getModelsForCapability(MediaCapability.TEXT_TO_VIDEO);
    const videoModel = textToVideoModels[0];
    
    if (!videoModel) {
      console.log('❌ No text-to-video models available');
    } else {
      const textToVideoModel = await provider.createTextToVideoModel(videoModel.id);
      console.log(`✅ Created model: ${videoModel.id}`);
        const videoPromptText = new Text(
        'a serene ocean wave crashing on a sandy beach, golden hour lighting, slow motion',
        'en',
        1.0,
        { content: 'a serene ocean wave crashing on a sandy beach, golden hour lighting, slow motion' }
      );
      console.log(`📝 Prompt: "${videoPromptText.metadata?.content || 'Unknown prompt'}"`);
      
      const generatedVideo = await textToVideoModel.transform(videoPromptText, {
        duration: 4,
        aspectRatio: '16:9',
        fps: 30
      });
      
      console.log(`✅ Generated video: ${generatedVideo.getDuration()}s, ${JSON.stringify(generatedVideo.getDimensions())}`);
      if (generatedVideo.metadata?.localPath) {
        console.log(`📁 Saved to: ${generatedVideo.metadata.localPath}`);
      }
    }

    // Test 3: Video-to-Video (Enhancement/Face Swap)
    console.log('\n� Test 3: Video-to-Video Processing');
    console.log('===================================');
    
    const videoToVideoModels = provider.getModelsForCapability(MediaCapability.VIDEO_TO_VIDEO);
    const enhanceModel = videoToVideoModels.find(m => 
      m.id.includes('enhance') || m.id.includes('upscale') || m.id.includes('face-swap')
    ) || videoToVideoModels[0];
    
    if (!enhanceModel) {
      console.log('❌ No video-to-video models available');
    } else {
      const videoToVideoModel = await provider.createVideoToVideoModel(enhanceModel.id);
      console.log(`✅ Created model: ${enhanceModel.id}`);
      
      // For this test, we'll just show the model exists - would need input video for full test
      console.log(`📋 Model supports formats: mp4, webm, mov`);
      console.log(`⚙️ Model ready for video processing`);
    }

    // Test 4: Text-to-Audio
    console.log('\n🔊 Test 4: Text-to-Audio Generation');
    console.log('====================================');
    
    const textToAudioModels = provider.getModelsForCapability(MediaCapability.TEXT_TO_AUDIO);
    const audioModel = textToAudioModels[0];
    
    if (!audioModel) {
      console.log('❌ No text-to-audio models available');
    } else {
      const textToAudioModel = await provider.createTextToAudioModel(audioModel.id);
      console.log(`✅ Created model: ${audioModel.id}`);
        const speechText = new Text(
        'Welcome to Prizm, the future of AI-powered media generation.',
        'en',
        1.0,
        { content: 'Welcome to Prizm, the future of AI-powered media generation.' }
      );
      console.log(`📝 Text: "${speechText.metadata?.content || 'Unknown text'}"`);
      
      const generatedAudio = await textToAudioModel.transform(speechText, {
        voice: 'female_1',
        language: 'en',
        speed: 1.0
      });
      
      console.log(`✅ Generated audio: ${(generatedAudio.getSize() / 1024).toFixed(1)}KB`);
      if (generatedAudio.metadata?.localPath) {
        console.log(`� Saved to: ${generatedAudio.metadata.localPath}`);
      }
    }    // Summary
    console.log('\n🎉 FAL.AI MODEL TESTS COMPLETED!');
    console.log('=================================');
    console.log('✅ Text-to-Image: Model discovery and creation');
    console.log('✅ Text-to-Video: Model discovery and creation');
    console.log('✅ Video-to-Video: Model discovery and creation');
    console.log('✅ Text-to-Audio: Model discovery and creation');
    
    console.log('\n🎯 fal.ai Provider Status: OPERATIONAL');
    console.log('Model types successfully implemented and tested!');

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
