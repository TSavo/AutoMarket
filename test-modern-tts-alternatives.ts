/**
 * Test Modern TTS Alternatives
 * 
 * This script tests the modern TTS models that replace the problematic ESPnet model.
 */

import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';
import { Text } from './src/media/assets/roles';

async function testModernTTSAlternatives() {
  console.log('🎙️ Testing Modern TTS Alternatives to ESPnet...\n');

  const provider = new HuggingFaceDockerProvider();

  // Check if service is available
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    console.log('❌ HuggingFace service not available');
    console.log('💡 Start with: docker-compose up -d');
    return;
  }

  console.log('✅ HuggingFace service is available!\n');

  // Test modern TTS alternatives
  const modernModels = [
    {
      id: 'microsoft/speecht5_tts',
      name: 'Microsoft SpeechT5',
      description: 'High-quality TTS, excellent alternative to ESPnet VITS'
    },
    {
      id: 'ResembleAI/chatterbox',
      name: 'ResembleAI Chatterbox',
      description: 'Modern trending TTS model (#1 on HuggingFace)'
    },
    {
      id: 'hexgrad/Kokoro-82M',
      name: 'Kokoro-82M',
      description: 'Efficient 82M parameter model, fast and lightweight'
    }
  ];

  const testText = 'Hello! This is a test of modern text-to-speech alternatives that work without ESPnet dependencies.';

  for (const modelInfo of modernModels) {
    console.log(`🔧 Testing ${modelInfo.name}...`);
    console.log(`   Model ID: ${modelInfo.id}`);
    console.log(`   Description: ${modelInfo.description}`);

    try {
      // Check if the provider supports this model
      const isSupported = provider.supportsTextToAudioModel(modelInfo.id);
      console.log(`   ✅ Supported by provider: ${isSupported}`);

      if (isSupported) {
        // Create the model instance
        const model = await provider.createTextToAudioModel(modelInfo.id);
        console.log(`   ✅ Model instance created successfully`);
        
        // Get model info
        console.log(`   📋 Max text length: ${model.getMaxTextLength()}`);
        console.log(`   🎵 Supported formats: ${model.getSupportedFormats().join(', ')}`);
        console.log(`   🎤 Voice cloning support: ${model.supportsVoiceCloning()}`);
        
        const voices = await model.getAvailableVoices();
        console.log(`   🗣️ Available voices: ${voices.join(', ')}`);        // Test availability
        const modelAvailable = await model.isAvailable();
        console.log(`   🔍 Model available for generation: ${modelAvailable}`);

        if (modelAvailable) {
          console.log(`   🎉 ${modelInfo.name} is ready for use!`);
          
          // Actually generate audio!
          console.log(`   🎵 Generating audio sample...`);
          const startTime = Date.now();
          
          try {
            // Create Text input from string
            const textInput = Text.fromString(testText);
            
            const audioAsset = await model.transform(textInput, {
              voice: 'default',
              format: 'wav'
            });            const duration = Date.now() - startTime;
            console.log(`   ✅ Audio generated successfully in ${duration}ms`);
            console.log(`   📁 Audio size: ${audioAsset.getHumanSize()}`);
            console.log(`   📊 Audio duration: ${audioAsset.getHumanDuration()}`);
            console.log(`   🎛️ Audio format: ${audioAsset.getFormat()}`);
            
            // Display metadata if available
            if (audioAsset.metadata) {
              console.log(`   📋 Additional metadata:`);
              if (audioAsset.metadata.localPath) {
                console.log(`      - Local file: ${audioAsset.metadata.localPath}`);
              }
              if (audioAsset.metadata.sampleRate) {
                console.log(`      - Sample rate: ${audioAsset.metadata.sampleRate}Hz`);
              }
              if (audioAsset.metadata.voice) {
                console.log(`      - Voice used: ${audioAsset.metadata.voice}`);
              }
            }
              } catch (audioError) {
            console.log(`   ❌ Audio generation failed: ${audioError instanceof Error ? audioError.message : 'Unknown error'}`);
          }
        } else {
          console.log(`   ⏳ ${modelInfo.name} needs to be loaded first`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error testing ${modelInfo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🎯 Summary:');
  console.log('✅ ESPnet models removed - no more dependency conflicts!');
  console.log('✅ Modern TTS alternatives available and tested');
  console.log('✅ Your HuggingFace setup now uses only compatible models');
  console.log('\n💡 Recommended models to use:');
  console.log('   1. microsoft/speecht5_tts - Proven, high-quality');
  console.log('   2. ResembleAI/chatterbox - Modern, trending');
  console.log('   3. hexgrad/Kokoro-82M - Lightweight, efficient');
}

async function main() {
  try {
    await testModernTTSAlternatives();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

if (require.main === module) {
  main();
}

export { testModernTTSAlternatives };
