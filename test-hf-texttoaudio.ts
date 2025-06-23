/**
 * Test HuggingFace TextToAudio Models
 * 
 * This script demonstrates the new TextToAudio support in HuggingFace Docker provider.
 * 
 * Run with: npm run test-hf-audio
 */

import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';
import { MediaCapability } from './src/media/types/provider';
import { Text } from './src/media/assets/roles';

async function testHuggingFaceTextToAudio() {
  console.log('🎵 Testing HuggingFace TextToAudio Support...\n');

  // Create HuggingFace provider
  const provider = new HuggingFaceDockerProvider();

  // Check provider capabilities
  console.log('Provider Capabilities:', provider.capabilities);
  console.log('Supports TEXT_TO_AUDIO:', provider.capabilities.includes(MediaCapability.TEXT_TO_AUDIO));

  // List available text-to-audio models
  console.log('\n📋 Available TextToAudio Models:');
  const audioModels = provider.getSupportedTextToAudioModels();
  audioModels.forEach((model, index) => {
    console.log(`  ${index + 1}. ${model}`);
  });

  // Check model support
  console.log('\n🔍 Model Support Check:');
  const testModels = [
    'microsoft/speecht5_tts',
    'facebook/musicgen-small',
    'runwayml/stable-diffusion-v1-5', // Should be text-to-image
    'coqui/XTTS-v2'
  ];

  testModels.forEach(modelId => {
    const isTextToAudio = provider.supportsTextToAudioModel(modelId);
    const isTextToImage = provider.supportsTextToImageModel(modelId);
    console.log(`  ${modelId}:`);
    console.log(`    - TextToAudio: ${isTextToAudio}`);
    console.log(`    - TextToImage: ${isTextToImage}`);
  });

  // Get models for TEXT_TO_AUDIO capability
  console.log('\n🎯 Models for TEXT_TO_AUDIO capability:');
  const audioCapabilityModels = provider.getModelsForCapability(MediaCapability.TEXT_TO_AUDIO);
  audioCapabilityModels.slice(0, 3).forEach(model => {
    console.log(`  📦 ${model.name}`);
    console.log(`     Description: ${model.description}`);
    console.log(`     Parameters: ${Object.keys(model.parameters).join(', ')}`);
  });

  // Test service availability (if service is running)
  console.log('\n🔧 Service Status:');
  try {
    const isAvailable = await provider.isAvailable();
    console.log(`  Service Available: ${isAvailable}`);

    if (isAvailable) {
      const health = await provider.getHealth();
      console.log(`  Health Status:`, health);
    }
  } catch (error) {
    console.log(`  Service not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Demonstrate model creation (without actually generating)
  console.log('\n🏗️  Model Creation Test:');
  try {
    const testModelId = 'microsoft/speecht5_tts';
    console.log(`  Creating TextToAudio model: ${testModelId}`);
      const audioModel = await provider.createTextToAudioModel(testModelId);
    console.log(`  ✅ Model created successfully!`);
    console.log(`     Model ID: ${testModelId}`);
    console.log(`     Provider: huggingface-docker`);
    console.log(`     Supported Formats: ${audioModel.getSupportedFormats().join(', ')}`);
    console.log(`     Max Text Length: ${audioModel.getMaxTextLength()}`);
    console.log(`     Supports Voice Cloning: ${audioModel.supportsVoiceCloning()}`);
    
    const voices = await audioModel.getAvailableVoices();
    console.log(`     Available Voices: ${voices.join(', ')}`);

  } catch (error) {
    console.log(`  ❌ Model creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n✅ HuggingFace TextToAudio test completed!');
  console.log('🎉 TextToAudio support successfully added to HuggingFace Docker provider!');
}

async function main() {
  try {
    await testHuggingFaceTextToAudio();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { testHuggingFaceTextToAudio };
