/**
 * Test OpenRouter with Free Models
 * 
 * Real test using OpenRouter's free models to verify the implementation works.
 */

import { OpenRouterProvider } from './src/media/providers/OpenRouterProvider';
import { Text } from './src/media/assets/roles';

async function testOpenRouterFree() {
  console.log('🧪 Testing OpenRouter with Free Models...\n');

  // Check for API key
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set OPENROUTER_API_KEY environment variable');
    console.log('   Get a free key at: https://openrouter.ai/keys');
    console.log('   Then run: export OPENROUTER_API_KEY="your-key-here"');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating OpenRouter Provider...');
    const provider = new OpenRouterProvider();
    
    await provider.configure({
      apiKey: apiKey,
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

    // 4. Test with free models (from our discovery)
    const freeModels = [
      'meta-llama/llama-3.3-70b-instruct:free',     // Llama 3.3 70B
      'qwen/qwen-2.5-72b-instruct:free',            // Qwen 2.5 72B
      'mistralai/mistral-nemo:free',                // Mistral Nemo
      'google/gemma-2-9b-it:free',                  // Gemma 2 9B
      'deepseek/deepseek-chat:free'                 // DeepSeek V3
    ];

    for (const modelId of freeModels) {
      console.log(`4️⃣ Testing model: ${modelId}`);
      
      try {
        // Create model
        const model = await provider.createTextToTextModel(modelId);
        console.log(`✅ Model created: ${model.getName()}`);

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

        // Success! We found a working free model
        console.log('🎉 OpenRouter implementation working perfectly!');
        return;

      } catch (error) {
        console.log(`❌ Model ${modelId} failed: ${error.message}`);
        console.log('   (This might be a rate limit or model unavailable)\n');
        continue;
      }
    }

    console.log('❌ All test models failed. This might be due to:');
    console.log('   - Rate limits on free models');
    console.log('   - Models temporarily unavailable');
    console.log('   - API key issues');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testOpenRouterFree().catch(console.error);
}

export { testOpenRouterFree };
