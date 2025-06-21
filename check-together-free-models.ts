/**
 * Check Together AI Free Models
 * 
 * Script to discover which models are actually free on Together.ai.
 */

import axios from 'axios';

interface TogetherModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  display_name?: string;
  description?: string;
  context_length?: number;
  pricing?: {
    input: number;
    output: number;
  };
}

async function checkTogetherFreeModels() {
  console.log('🔍 Checking Together AI for free models...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    console.log('   Get a free key at: https://api.together.xyz/settings/api-keys');
    return;
  }

  try {
    // Fetch all available models
    const response = await axios.get('https://api.together.xyz/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Raw response:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...\n');

    const models: TogetherModel[] = response.data.data || response.data || [];
    console.log(`📊 Found ${models.length} total models\n`);

    // Filter for free models (pricing = 0)
    const freeModels = models.filter(model => 
      model.pricing?.input === 0 && model.pricing?.output === 0
    );

    console.log(`🆓 Found ${freeModels.length} free models:\n`);

    freeModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
      if (model.display_name) {
        console.log(`   Name: ${model.display_name}`);
      }
      if (model.description) {
        console.log(`   Description: ${model.description.substring(0, 100)}...`);
      }
      if (model.context_length) {
        console.log(`   Context: ${model.context_length} tokens`);
      }
      console.log(`   Owner: ${model.owned_by}`);
      console.log();
    });

    // Test one free model if available
    if (freeModels.length > 0) {
      const testModel = freeModels[0];
      console.log(`🧪 Testing free model: ${testModel.id}\n`);

      const chatResponse = await axios.post('https://api.together.xyz/v1/chat/completions', {
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
          'Content-Type': 'application/json'
        }
      });

      const result = chatResponse.data;
      if (result.choices && result.choices.length > 0) {
        console.log('✅ Test successful!');
        console.log(`📝 Generated: "${result.choices[0].message.content}"`);
        console.log(`💰 Usage: ${result.usage?.total_tokens} tokens\n`);
      }
    } else {
      console.log('ℹ️ No completely free models found, but Together AI has very affordable pricing.');
      console.log('   Many models cost less than $0.001 per 1K tokens.\n');
      
      // Show some of the cheapest models
      const cheapModels = models
        .filter(model => model.pricing && model.pricing.input < 0.001)
        .slice(0, 5);
        
      if (cheapModels.length > 0) {
        console.log('💰 Some very affordable models:\n');
        cheapModels.forEach((model, index) => {
          console.log(`${index + 1}. ${model.id}`);
          console.log(`   Input: $${model.pricing?.input}/1K tokens`);
          console.log(`   Output: $${model.pricing?.output}/1K tokens`);
          console.log();
        });
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
  checkTogetherFreeModels().catch(console.error);
}

export { checkTogetherFreeModels };
