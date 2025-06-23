/**
 * Generate Audio with HuggingFace TextToAudio
 * 
 * This script demonstrates actual audio generation using the enhanced HuggingFace provider.
 */

import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';
import { Text } from './src/media/assets/roles';
import * as fs from 'fs';
import * as path from 'path';

async function generateAudioSamples() {
  console.log('🎵 Generating Audio with HuggingFace TextToAudio...\n');

  const provider = new HuggingFaceDockerProvider();

  // Check if service is available
  console.log('🔧 Checking service status...');
  const isAvailable = await provider.isAvailable();
  
  if (!isAvailable) {
    console.log('❌ HuggingFace Docker service is not available');
    console.log('💡 Please start the service first:');
    console.log('   docker run -p 8007:8000 huggingface-multimodal:latest');
    return;
  }

  console.log('✅ HuggingFace service is available!\n');

  // Create output directory
  const outputDir = './generated_audio';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Test different text-to-audio models
  const testCases = [
    {
      modelId: 'microsoft/speecht5_tts',
      text: 'Hello! This is a test of Microsoft SpeechT5 text-to-speech synthesis.',
      options: {
        voice: 'speaker_1',
        speed: 1.0,
        format: 'wav' as const,
        sampleRate: 22050
      },
      filename: 'speecht5_test.wav'
    },
    {
      modelId: 'facebook/musicgen-small',
      text: 'upbeat electronic dance music with synthesizers',
      options: {
        format: 'wav' as const,
        sampleRate: 44100
      },
      filename: 'musicgen_edm.wav'
    },
    {
      modelId: 'suno/bark',
      text: 'Welcome to the future of AI-powered audio generation!',
      options: {
        voice: 'default',
        speed: 1.1,
        format: 'wav' as const
      },
      filename: 'bark_welcome.wav'
    }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`🎤 Testing ${testCase.modelId}...`);
      console.log(`   Text: "${testCase.text}"`);
      console.log(`   Options:`, testCase.options);

      // Create the model
      const audioModel = await provider.createTextToAudioModel(testCase.modelId);
      
      // Get model info
      console.log(`   📋 Model Info:`);
      console.log(`      - Supported Formats: ${audioModel.getSupportedFormats().join(', ')}`);
      console.log(`      - Max Text Length: ${audioModel.getMaxTextLength()}`);
      console.log(`      - Voice Cloning: ${audioModel.supportsVoiceCloning()}`);
      
      const voices = await audioModel.getAvailableVoices();
      console.log(`      - Available Voices: ${voices.join(', ')}`);

      // Create text input
      const textInput = Text.fromString(testCase.text);

      // Generate audio
      console.log(`   🎵 Generating audio...`);
      const startTime = Date.now();
      
      const audio = await audioModel.transform(textInput, testCase.options);
      
      const generationTime = Date.now() - startTime;
      console.log(`   ✅ Audio generated in ${generationTime}ms`);
      console.log(`   📏 Audio size: ${audio.getHumanSize()}`);
      console.log(`   ⏱️ Duration: ${audio.getHumanDuration()}`);

      // Save the audio file
      const outputPath = path.join(outputDir, testCase.filename);
      fs.writeFileSync(outputPath, audio.data);
      console.log(`   💾 Saved to: ${outputPath}`);

      // Display metadata
      if (audio.metadata) {
        console.log(`   📊 Metadata:`);
        console.log(`      - Format: ${audio.metadata.format}`);
        console.log(`      - Sample Rate: ${audio.metadata.sampleRate}Hz`);
        console.log(`      - Processing Time: ${audio.metadata.processingTime}ms`);
        if (audio.metadata.voice) {
          console.log(`      - Voice: ${audio.metadata.voice}`);
        }
      }

      console.log(`   🎉 ${testCase.modelId} test completed!\n`);

    } catch (error) {
      console.log(`   ❌ Failed to generate audio with ${testCase.modelId}:`);
      console.log(`      Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`   ⚠️ This might be because the model is not loaded or supported by the service\n`);
    }
  }

  // Test model type detection
  console.log('🔍 Testing Model Type Detection:');
  const modelTests = [
    'microsoft/speecht5_tts',
    'facebook/musicgen-medium',
    'runwayml/stable-diffusion-v1-5',
    'coqui/XTTS-v2'
  ];

  modelTests.forEach(modelId => {
    const isAudio = provider.supportsTextToAudioModel(modelId);
    const isImage = provider.supportsTextToImageModel(modelId);
    console.log(`  ${modelId}: Audio=${isAudio}, Image=${isImage}`);
  });

  console.log('\n🎵 Audio generation test completed!');
  console.log(`📁 Check the '${outputDir}' directory for generated audio files.`);
  console.log('🎧 You can play these files with any audio player!');
}

async function main() {
  try {
    await generateAudioSamples();
  } catch (error) {
    console.error('❌ Audio generation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateAudioSamples };
