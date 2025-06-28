/**
 * Check OpenRouter Free Models
 * 
 * Script to discover which models are actually free on OpenRouter.
 */

import axios from 'axios';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

async function checkFreeModels() {
  console.log('🔍 Checking OpenRouter for free models...\n');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set OPENROUTER_API_KEY environment variable');
    return;
  }

  try {
    // Fetch all available models
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://prizm.ai',
        'X-Title': 'Prizm AI Model Discovery'
      }
    });

    const models: OpenRouterModel[] = response.data.data;
    console.log(`📊 Found ${models.length} total models\n`);

    // Filter for free models (pricing = "0")
    const freeModels = models.filter(model => 
      model.pricing?.prompt === "0" && model.pricing?.completion === "0"
    );

    console.log(`🆓 Found ${freeModels.length} free models:\n`);

    freeModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
      console.log(`   Name: ${model.name}`);
      if (model.description) {
        console.log(`   Description: ${model.description.substring(0, 100)}...`);
      }
      if (model.context_length) {
        console.log(`   Context: ${model.context_length} tokens`);
      }
      console.log();
    });

    // Test one free model
    if (freeModels.length > 0) {
      const testModel = freeModels[0];
      console.log(`🧪 Testing free model: ${testModel.id}\n`);

      const chatResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: testModel.id,
        messages: [
          {
            role: 'user',
            content: 'Write a very short haiku about AI.'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prizm.ai',
          'X-Title': 'Prizm AI Test'
        }
      });

      const result = chatResponse.data;
      if (result.choices && result.choices.length > 0) {
        console.log('✅ Test successful!');
        console.log(`📝 Generated: "${result.choices[0].message.content}"`);
        console.log(`💰 Usage: ${result.usage?.total_tokens} tokens\n`);
      }
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run the check
if (require.main === module) {
  checkFreeModels().catch(console.error);
}

export { checkFreeModels };
