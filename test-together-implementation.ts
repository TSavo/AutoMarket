/**
 * Test Together AI Implementation
 * 
 * Real test using Together.ai models to verify the implementation works.
 */

import { TogetherProvider } from './src/media/providers/together/TogetherProvider';
import { Text } from './src/media/assets/roles';

async function testTogetherImplementation() {
  console.log('🧪 Testing Together AI Implementation...\n');

  // Check for API key
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    console.log('   Get a free key at: https://api.together.xyz/settings/api-keys');
    console.log('   Then run: export TOGETHER_API_KEY="your-key-here"');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Together AI Provider...');
    const provider = new TogetherProvider();
    
    await provider.configure({
      apiKey: apiKey
    });
    console.log('✅ Provider configured\n');

    // 2. Check availability
    console.log('2️⃣ Checking availability...');
    const isAvailable = await provider.isAvailable();
    console.log(`✅ Available: ${isAvailable}\n`);

    if (!isAvailable) {
      console.log('❌ Provider not available, check your API key');
      return;
    }

    // 3. List available models
    console.log('3️⃣ Listing models...');
    const models = provider.models;
    console.log(`✅ Found ${models.length} models\n`);

    // 4. Check for free models
    console.log('4️⃣ Checking for free models...');
    const freeModels = provider.getFreeModels();
    console.log(`✅ Found ${freeModels.length} free models\n`);

    // 5. Test with free text generation models (from our discovery)
    const testModels = [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',  // Free Llama 3.3 70B
      'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free', // Free DeepSeek R1
      'lgai/exaone-3-5-32b-instruct',                   // Free EXAONE 3.5 32B
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',   // Usually very cheap
      'mistralai/Mistral-7B-Instruct-v0.3'             // Often affordable
    ];

    for (const modelId of testModels) {
      console.log(`5️⃣ Testing model: ${modelId}`);
      
      try {
        // Check if model is supported
        if (!provider.supportsTextToTextModel(modelId)) {
          console.log(`❌ Model ${modelId} not supported, skipping...\n`);
          continue;
        }

        // Create model
        const model = await provider.createTextToTextModel(modelId);
        console.log(`✅ Model created: ${model.getName()}`);

        // Check if it's free
        const isFree = provider.isModelFree(modelId);
        console.log(`💰 Free model: ${isFree}`);

        // Test text generation
        const input = new Text('Write a very short haiku about coding.');
        console.log(`📝 Input: "${input.content}"`);

        const result = await model.transform(input, {
          temperature: 0.7,
          maxOutputTokens: 50
        });

        console.log(`✅ Generated text: "${result.content}"`);
        console.log(`   Language: ${result.language}`);
        console.log(`   Confidence: ${result.confidence}`);
        console.log(`   Processing time: ${result.metadata?.processingTime}ms\n`);

        // Success! We found a working model
        console.log('🎉 Together AI implementation working perfectly!');
        return;

      } catch (error) {
        console.log(`❌ Model ${modelId} failed: ${error.message}`);
        console.log('   (This might be a rate limit or model unavailable)\n');
        continue;
      }
    }

    console.log('❌ All test models failed. This might be due to:');
    console.log('   - Rate limits');
    console.log('   - Models temporarily unavailable');
    console.log('   - API key issues');
    console.log('   - Models requiring payment (Together AI has very affordable pricing)');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherImplementation().catch(console.error);
}

export { testTogetherImplementation };
