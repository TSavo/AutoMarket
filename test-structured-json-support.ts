/**
 * Test Structured JSON Support in TextToText Interface
 * 
 * Tests the new responseFormat parameter for both OpenRouter and Together providers
 * to enable structured JSON output for models that support it.
 */

import { OpenRouterProvider } from './src/media/providers/openrouter';
import { TogetherProvider } from './src/media/providers/together';
import { Text } from './src/media/assets/roles';

async function testStructuredJSON() {
  console.log('🧪 Testing Structured JSON Support in TextToText Interface\n');

  // Test with OpenRouter
  console.log('1️⃣ Testing OpenRouter + DeepSeek with Structured JSON...');
  await testOpenRouterStructuredJSON();

  console.log('\n2️⃣ Testing Together AI with Structured JSON...');
  await testTogetherStructuredJSON();

  console.log('\n🎉 All structured JSON tests completed!');
}

async function testOpenRouterStructuredJSON() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY not set - skipping OpenRouter test');
    return;
  }

  try {
    // Initialize provider
    const provider = new OpenRouterProvider();
    await provider.configure({ apiKey });

    // Create model instance
    const model = await provider.createTextToTextModel('deepseek/deepseek-chat:free');

    // Test 1: Simple JSON categorization
    console.log('   📋 Test 1: AI Model Categorization');
    const categoryPrompt = new Text(`
      Model: fal-ai/flux-pro
      Description: FLUX.1 [pro] generates high-quality images from text prompts using a 12B parameter transformer.
      
      Categorize this model into one of: TEXT_TO_IMAGE, IMAGE_TO_VIDEO, TEXT_TO_VIDEO, VIDEO_TO_VIDEO, TEXT_TO_SPEECH, SPEECH_TO_TEXT.
    `);

    const categoryResult = await model.transform(categoryPrompt, {
      temperature: 0.1,
      maxOutputTokens: 50,
      systemPrompt: 'You categorize AI models. Respond with valid JSON only. Use this exact format: {"category": "TEXT_TO_IMAGE"}',
      responseFormat: 'json'
    });

    console.log('   ✅ JSON Response:', categoryResult.content.trim());
    
    // Validate JSON
    try {
      const parsed = JSON.parse(categoryResult.content);
      console.log('   ✅ Valid JSON parsed:', parsed);
    } catch (error) {
      console.log('   ❌ Invalid JSON returned');
    }

    // Test 2: Complex parameter extraction
    console.log('\n   ⚙️ Test 2: Parameter Schema Extraction');
    const paramPrompt = new Text(`
      Extract parameters for a text-to-image model like FLUX Pro.
      Return a JSON schema with parameter names, types, and descriptions.
    `);

    const paramResult = await model.transform(paramPrompt, {
      temperature: 0.2,
      maxOutputTokens: 300,
      systemPrompt: 'You extract API parameters. Return valid JSON with parameter definitions.',
      responseFormat: { type: 'json_object' }
    });

    console.log('   ✅ Parameter Schema:');
    try {
      const schema = JSON.parse(paramResult.content);
      console.log('   📋', JSON.stringify(schema, null, 2).substring(0, 300), '...');
    } catch (error) {
      console.log('   ❌ Invalid JSON in parameter schema');
    }

  } catch (error) {
    console.log(`   ❌ OpenRouter test failed: ${error.message}`);
  }
}

async function testTogetherStructuredJSON() {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ TOGETHER_API_KEY not set - skipping Together test');
    return;
  }

  try {    // Initialize provider
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });

    // Get a free model (or any available model)
    const models = provider.getSupportedTextToTextModels();
    if (models.length === 0) {
      console.log('❌ No Together models available');
      return;
    }

    const model = await provider.createTextToTextModel(models[0]);

    // Test: Model discovery data extraction
    console.log(`   🔍 Testing with model: ${models[0]}`);
    const discoveryPrompt = new Text(`
      Given this HTML snippet from a model page:
      <div class="model-card">
        <h2>Stable Diffusion XL</h2>
        <p>High-resolution text-to-image generation with exceptional quality</p>
        <span class="category">text-to-image</span>
      </div>
      
      Extract structured information.
    `);

    const discoveryResult = await model.transform(discoveryPrompt, {
      temperature: 0.1,
      maxOutputTokens: 200,
      systemPrompt: 'Extract model info from HTML. Return JSON: {"name": "...", "category": "...", "description": "..."}',
      responseFormat: 'json'
    });

    console.log('   ✅ Extracted Data:', discoveryResult.content.trim());
    
    // Validate JSON
    try {
      const extracted = JSON.parse(discoveryResult.content);
      console.log('   ✅ Valid extraction:', extracted);
    } catch (error) {
      console.log('   ❌ Invalid JSON returned');
    }

  } catch (error) {
    console.log(`   ❌ Together test failed: ${error.message}`);
  }
}

// Usage examples for documentation
function showUsageExamples() {
  console.log(`
📖 Usage Examples:

// 1. Simple JSON response
const result = await model.transform(prompt, {
  responseFormat: 'json',
  systemPrompt: 'Return valid JSON only'
});

// 2. Explicit JSON object format
const result = await model.transform(prompt, {
  responseFormat: { type: 'json_object' },
  systemPrompt: 'Respond with structured JSON'
});

// 3. Use in API calls
fetch('/api/v1/transform/openrouter/deepseek%2Fdeepseek-chat%3Afree', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capability: 'text-to-text',
    input: {
      content: 'Categorize this AI model...',
      metadata: {}
    },
    options: {
      systemPrompt: 'Return JSON categorization',
      responseFormat: 'json',
      temperature: 0.1,
      maxTokens: 100
    }
  })
});

🎯 Key Benefits:
✅ Structured JSON output for data extraction
✅ Reliable parsing for automated workflows  
✅ Model categorization and discovery
✅ Parameter schema extraction
✅ Compatible with OpenRouter and Together AI
✅ Backward compatible with existing text responses
  `);
}

if (require.main === module) {
  testStructuredJSON()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      showUsageExamples();
    })
    .catch(console.error);
}

export { testStructuredJSON };
