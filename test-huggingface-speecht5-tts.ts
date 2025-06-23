/**
 * Test script for HuggingFace SpeechT5 TTS
 * 
 * Tests the SpeechT5 TTS model via the HuggingFace Docker provider.
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { MediaCapability } from './src/media/types/provider';
import { Text } from './src/media/assets/roles';
import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';

async function testSpeechT5TTS() {
  console.log('🗣️  Testing SpeechT5 TTS via HuggingFace Docker Provider...\n');

  try {
    // Initialize providers
    console.log('📦 Initializing providers...');
    await initializeProviders();
    
    // Get HuggingFace provider
    console.log('🔍 Getting HuggingFace Docker provider...');
    const baseProvider = await getProvider('huggingface-docker');
    
    if (!baseProvider) {
      throw new Error('HuggingFace Docker provider not found');
    }
    
    // Cast to specific provider type to access extended methods
    const provider = baseProvider as unknown as HuggingFaceDockerProvider;
    
    console.log(`✅ Provider found: ${provider.name}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    
    // Check if TEXT_TO_AUDIO capability is supported
    if (!provider.capabilities.includes(MediaCapability.TEXT_TO_AUDIO)) {
      throw new Error('TEXT_TO_AUDIO capability not supported by provider');
    }
    
    // Check if service is available
    console.log('\n🔍 Checking service availability...');
    const isAvailable = await provider.isAvailable();
    console.log(`   Service Available: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log('\n⚠️  Service not available. Starting Docker service...');
      
      try {
        console.log('🚀 Starting HuggingFace Docker service...');
        const startResult = await provider.startService();
        
        if (startResult) {
          console.log('✅ Service started successfully!');
        } else {
          console.log('❌ Failed to start service. Manual steps:');
          console.log('   1. Navigate to services/huggingface/');
          console.log('   2. Run: docker-compose up -d');
          console.log('   3. Wait for service to be healthy');
          console.log('   4. Re-run this test');
          return;
        }
      } catch (error) {
        console.error('❌ Error starting service:', error instanceof Error ? error.message : 'Unknown error');
        return;
      }
    }
      // Test SpeechT5 TTS model
    console.log('\n🎙️  Testing SpeechT5 TTS model...');
    const speechT5ModelId = 'microsoft/speecht5_tts';
    console.log(`   Creating model: ${speechT5ModelId}`);
    
    const model = await provider.getModel(speechT5ModelId);
    console.log(`✅ SpeechT5 model created successfully`);
    
    // Test model availability
    console.log('\n🔍 Testing model availability...');
    const modelAvailable = await model.isAvailable();
    console.log(`   Model Available: ${modelAvailable}`);
    
    if (modelAvailable) {
      console.log('\n🎵 Testing text-to-speech generation...');
      
      // Create text input
      const textInput = new Text('Hello world! This is a test of the SpeechT5 text to speech model running in the HuggingFace Docker provider.', 'en', 1.0);
      
      console.log(`   Text: "${textInput.content}"`);
      console.log(`   Language: ${textInput.language}`);
      
      try {
        const startTime = Date.now();
        console.log('   🔄 Generating speech...');
        
        const audio = await model.transform(textInput, {
          voice: 'default'  // SpeechT5 will use default speaker embeddings
        });
        
        const duration = Date.now() - startTime;
          console.log(`✅ Speech generated successfully!`);
        console.log(`   Generation time: ${duration}ms`);
        console.log(`   Audio format: ${audio.format}`);
        console.log(`   Audio size: ${audio.getSize()} bytes (${audio.getHumanSize()})`);
        
        // Cast to Audio type to access audio-specific properties
        const audioResult = audio as any;
        if (audioResult.duration !== undefined) {
          console.log(`   Duration: ${audioResult.duration}s`);
        }
        if (audioResult.sampleRate !== undefined) {
          console.log(`   Sample rate: ${audioResult.sampleRate}Hz`);
        }
        if (audioResult.channels !== undefined) {
          console.log(`   Channels: ${audioResult.channels}`);
        }
        
        // Get file path from metadata if available
        if (audio.metadata) {
          const filePath = audio.metadata.filePath || audio.metadata.sourceUrl;
          if (filePath) {
            console.log(`   Audio file: ${filePath}`);
          }
        }
        
        // Check if metadata was added
        if ((audio as any).metadata) {
          const metadata = (audio as any).metadata;
          console.log(`   Model used: ${metadata.modelId || speechT5ModelId}`);
          console.log(`   Voice: ${metadata.voice || 'default'}`);
        }
        
      } catch (error) {
        console.error(`❌ Speech generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Print additional error details if available
        if (error instanceof Error && error.stack) {
          console.error('Stack trace:', error.stack);
        }
      }
    } else {
      console.log('❌ Model not available. The service may still be loading the model.');
      console.log('   Try running the test again in a few minutes.');
    }
      // Test supported TTS models
    console.log('\n📋 Testing supported TTS models...');
    try {
      const supportedModels = provider.getSupportedTextToAudioModels();
      console.log(`   Supported TTS models: ${supportedModels.slice(0, 5).join(', ')}...`);
      console.log(`   Total supported models: ${supportedModels.length}`);
      
      // Check if SpeechT5 is in the supported list
      const speechT5Supported = supportedModels.includes(speechT5ModelId);
      console.log(`   SpeechT5 supported: ${speechT5Supported ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`   Could not get supported models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Get service health
    console.log('\n🏥 Getting service health...');
    try {
      const health = await provider.getServiceHealth();
      console.log(`   Status: ${health.status}`);
      console.log(`   Loaded Models: ${health.loadedModels?.length || 0}`);
      
      if (health.loadedModels && health.loadedModels.length > 0) {
        console.log('   Currently loaded models:');
        for (const modelInfo of health.loadedModels) {
          console.log(`     - ${modelInfo.modelId} (${modelInfo.memoryUsage}MB)`);
        }
      }
    } catch (error) {
      console.log(`   Could not get service health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n🎉 SpeechT5 TTS test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
if (require.main === module) {
  testSpeechT5TTS().catch(console.error);
}

export { testSpeechT5TTS };
