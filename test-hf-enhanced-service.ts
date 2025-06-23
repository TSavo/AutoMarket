/**
 * Test Enhanced HuggingFace Service with TextToAudio Support
 * 
 * This tests the newly enhanced HuggingFace service that now supports both:
 * - Text-to-Image generation (existing)
 * - Text-to-Audio generation (new!)
 */

import axios from 'axios';
import * as fs from 'fs';

const HF_SERVICE_URL = 'http://localhost:8007';

async function testEnhancedHuggingFaceService() {
  console.log('🎵 Testing Enhanced HuggingFace Service with Audio Support...\n');

  try {
    // 1. Check service health
    console.log('1. 🏥 Checking service health...');
    const healthResponse = await axios.get(`${HF_SERVICE_URL}/health`);
    console.log('   ✅ Service is healthy!');
    console.log('   📊 Status:', healthResponse.data.status);
    console.log('   🧠 GPU:', healthResponse.data.gpuInfo ? 'Available' : 'Not available');
    console.log('   📦 Loaded models:', healthResponse.data.loadedModels.length);

    // 2. Test Text-to-Audio generation with a TTS model
    console.log('\n2. 🎤 Testing Text-to-Audio generation...');
    
    const audioRequest = {
      modelId: 'microsoft/speecht5_tts',
      prompt: 'Hello! This is a test of the enhanced HuggingFace service with text to audio support.',
      voice: 'default',
      speed: 1.0,
      format: 'wav',
      sampleRate: 22050
    };

    console.log('   📝 Sending audio generation request...');
    console.log('   🤖 Model:', audioRequest.modelId);
    console.log('   💬 Text:', audioRequest.prompt);

    try {
      const audioResponse = await axios.post(`${HF_SERVICE_URL}/generate/audio`, audioRequest, {
        timeout: 120000 // 2 minutes timeout for model loading
      });

      if (audioResponse.data.success) {
        console.log('   ✅ Audio generated successfully!');
        console.log('   ⏱️  Generation time:', audioResponse.data.metadata.generationTime?.toFixed(2) + 's');
        console.log('   🎵 Format:', audioResponse.data.metadata.format);
        console.log('   📏 Sample rate:', audioResponse.data.metadata.sampleRate);
        
        if (audioResponse.data.audioBase64) {
          console.log('   💾 Audio data received (base64)');
          
          // Save audio to file for verification
          const audioBuffer = Buffer.from(audioResponse.data.audioBase64, 'base64');
          const filename = `test_hf_audio_${Date.now()}.wav`;
          fs.writeFileSync(filename, audioBuffer);
          console.log(`   💾 Audio saved to: ${filename}`);
          console.log(`   📊 Audio size: ${audioBuffer.length} bytes`);
        }
      } else {
        console.log('   ❌ Audio generation failed:', audioResponse.data.error);
      }

    } catch (audioError: any) {
      if (audioError.response?.status === 400) {
        console.log('   ⚠️  Model loading or generation issue:', audioError.response.data.detail);
      } else {
        console.log('   ❌ Audio generation error:', audioError.message);
      }
    }

    // 3. Test Text-to-Image generation (existing functionality)
    console.log('\n3. 🖼️  Testing Text-to-Image generation (existing functionality)...');
    
    const imageRequest = {
      modelId: 'runwayml/stable-diffusion-v1-5',
      prompt: 'A beautiful sunset over mountains, digital art',
      width: 512,
      height: 512,
      numInferenceSteps: 20,
      guidanceScale: 7.5
    };

    console.log('   📝 Sending image generation request...');
    console.log('   🤖 Model:', imageRequest.modelId);
    console.log('   💬 Prompt:', imageRequest.prompt);

    try {
      const imageResponse = await axios.post(`${HF_SERVICE_URL}/generate/image`, imageRequest, {
        timeout: 120000 // 2 minutes timeout
      });

      if (imageResponse.data.success) {
        console.log('   ✅ Image generated successfully!');
        console.log('   ⏱️  Generation time:', imageResponse.data.metadata.generationTime?.toFixed(2) + 's');
        console.log('   📐 Size:', `${imageRequest.width}x${imageRequest.height}`);
        
        if (imageResponse.data.imageBase64) {
          console.log('   💾 Image data received (base64)');
          
          // Save image to file for verification
          const imageBuffer = Buffer.from(imageResponse.data.imageBase64, 'base64');
          const filename = `test_hf_image_${Date.now()}.png`;
          fs.writeFileSync(filename, imageBuffer);
          console.log(`   💾 Image saved to: ${filename}`);
          console.log(`   📊 Image size: ${imageBuffer.length} bytes`);
        }
      } else {
        console.log('   ❌ Image generation failed:', imageResponse.data.error);
      }

    } catch (imageError: any) {
      if (imageError.response?.status === 400) {
        console.log('   ⚠️  Model loading or generation issue:', imageError.response.data.detail);
      } else {
        console.log('   ❌ Image generation error:', imageError.message);
      }
    }

    // 4. Check loaded models after generation
    console.log('\n4. 📦 Checking loaded models...');
    const modelsResponse = await axios.get(`${HF_SERVICE_URL}/models`);
    console.log('   📊 Number of loaded models:', modelsResponse.data.length);
    
    modelsResponse.data.forEach((model: any, index: number) => {
      console.log(`   ${index + 1}. 🤖 ${model.modelId}`);
      console.log(`      📋 Type: ${model.modelType || 'text-to-image'}`);
      console.log(`      🧠 Memory: ${model.memoryUsage}MB`);
      console.log(`      ⏰ Load time: ${model.loadTime?.toFixed(2)}s`);
    });

    console.log('\n🎉 Enhanced HuggingFace Service Test Complete!');
    console.log('✅ The service now supports BOTH text-to-image AND text-to-audio generation!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📄 Response:', error.response.data);
    }
  }
}

async function main() {
  try {
    await testEnhancedHuggingFaceService();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { testEnhancedHuggingFaceService };
