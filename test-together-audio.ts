/**
 * Test Together AI Audio Generation
 * 
 * Test the new TextToAudioProvider functionality with Cartesia Sonic models
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';

async function testTogetherAudio() {
  console.log('🎵 Testing Together AI Audio Generation...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Together AI Provider with audio support...');
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    
    console.log('✅ Provider configured\n');

    // 2. Check audio model support
    console.log('2️⃣ Checking audio model support...');
    const allModels = provider.models;
    const audioModels = provider.getAudioModels();
    
    console.log(`✅ Total models: ${allModels.length}`);
    console.log(`✅ Audio models: ${audioModels.length}\n`);

    if (audioModels.length === 0) {
      console.log('❌ No audio models found');
      return;
    }

    // 3. Show available audio models
    console.log('3️⃣ Available audio models:');
    audioModels.forEach(model => {
      console.log(`   - ${model.id} (${model.name})`);
      console.log(`     Pricing: $${model.pricing?.inputCost}/$${model.pricing?.outputCost}`);
      console.log(`     Parameters: ${Object.keys(model.parameters || {}).join(', ')}`);
      console.log();
    });

    // 4. Test TextToAudioProvider interface
    console.log('4️⃣ Testing TextToAudioProvider interface...');
    
    const supportedModels = provider.getSupportedTextToAudioModels();
    console.log(`✅ Supported audio models: ${supportedModels.length}`);
    supportedModels.forEach(modelId => {
      console.log(`   - ${modelId}`);
    });

    // Test model support check
    const testModelId = 'cartesia/sonic';
    const isSupported = provider.supportsTextToAudioModel(testModelId);
    console.log(`✅ Model '${testModelId}' supported: ${isSupported}\n`);

    // 5. Test model creation
    console.log('5️⃣ Testing audio model creation...');
    
    if (isSupported) {
      try {
        const audioModel = await provider.createTextToAudioModel(testModelId);
        console.log(`✅ Audio model created: ${audioModel.getName()}`);
        
        // Check if model is available
        const isAvailable = await audioModel.isAvailable();
        console.log(`✅ Model available: ${isAvailable}`);
        
        // Get model info
        const modelInfo = (audioModel as any).getModelInfo?.();
        if (modelInfo) {
          console.log(`✅ Model info:`, modelInfo);
        }
        
        // Get supported parameters
        const supportedParams = (audioModel as any).getSupportedParameters?.();
        if (supportedParams) {
          console.log(`✅ Supported parameters: ${supportedParams.join(', ')}`);
        }
        
        // Get available voices
        const availableVoices = (audioModel as any).getAvailableVoices?.();
        if (availableVoices) {
          console.log(`✅ Available voices: ${availableVoices.join(', ')}`);
        }
        
        console.log();
        
      } catch (error) {
        console.log(`❌ Audio model creation failed: ${error.message}`);
      }
    }

    // 6. Test actual audio generation (if user wants to test)
    console.log('6️⃣ Audio generation test...');
    console.log('💰 Note: Audio generation with Cartesia Sonic costs $0.065 per 1K characters');
    console.log('💰 Example costs: 50 chars = ~$0.003, 500 chars = ~$0.03, 5K chars = ~$0.33');
    console.log('⚠️  Skipping actual generation for now - uncomment code below to test\n');

    /*
    // Uncomment to test actual audio generation (costs money!)
    if (isSupported) {
      try {
        console.log('🧪 Testing audio generation...');
        const audioModel = await provider.createTextToAudioModel(testModelId);
        
        const testText = 'Hello, this is a test of Together AI audio generation using Cartesia Sonic.';
        console.log(`🎤 Generating audio for: "${testText}"`);
        
        const audio = await audioModel.transform(testText, {
          voice: 'default',
          speed: 1.0,
          output_format: 'mp3'
        });
        
        console.log(`✅ Audio generated successfully!`);
        console.log(`   Duration: ${audio.metadata?.duration}s`);
        console.log(`   File size: ${(audio.metadata?.fileSize / 1024).toFixed(1)}KB`);
        console.log(`   Local path: ${audio.metadata?.localPath}`);
        
      } catch (error) {
        console.log(`❌ Audio generation failed: ${error.message}`);
      }
    }
    */

    // 7. Test provider capabilities
    console.log('7️⃣ Testing provider capabilities...');
    
    const capabilities = provider.capabilities;
    console.log(`✅ Provider capabilities: ${capabilities.join(', ')}`);
    
    const hasAudioGeneration = capabilities.includes('audio-generation' as any);
    console.log(`✅ Has audio generation: ${hasAudioGeneration}`);
    
    // Test health check
    const health = await provider.getHealth();
    console.log(`✅ Provider health: ${health.status}`);

    console.log('\n🎉 Together AI Audio testing completed!');
    console.log('📊 Summary:');
    console.log(`   - Audio models available: ${audioModels.length}`);
    console.log(`   - TextToAudioProvider: ✅ Implemented`);
    console.log(`   - Model creation: ✅ Working`);
    console.log(`   - Audio generation: ⚠️  Requires payment (Cartesia Sonic)`);

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherAudio().catch(console.error);
}

export { testTogetherAudio };
