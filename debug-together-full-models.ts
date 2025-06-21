/**
 * Debug Together AI Full Model List
 * 
 * Investigate why we're only getting 80 models instead of 300+
 */

import axios from 'axios';

async function debugTogetherFullModels() {
  console.log('🔍 Debugging Together AI Full Model Discovery...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Test different endpoints and parameters
    console.log('1️⃣ Testing different model endpoints...');
    
    const baseHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Try the standard models endpoint
    console.log('📋 Testing /v1/models...');
    try {
      const response1 = await axios.get('https://api.together.xyz/v1/models', {
        headers: baseHeaders
      });
      console.log(`✅ /v1/models: ${response1.status} - ${response1.data.data?.length || response1.data.length || 'unknown'} models`);
    } catch (error) {
      console.log(`❌ /v1/models failed: ${error.message}`);
    }

    // Try with pagination parameters
    console.log('📋 Testing /v1/models with pagination...');
    try {
      const response2 = await axios.get('https://api.together.xyz/v1/models?limit=1000', {
        headers: baseHeaders
      });
      console.log(`✅ /v1/models?limit=1000: ${response2.status} - ${response2.data.data?.length || response2.data.length || 'unknown'} models`);
    } catch (error) {
      console.log(`❌ /v1/models with limit failed: ${error.message}`);
    }

    // Try different API versions
    console.log('📋 Testing different API versions...');
    const endpoints = [
      'https://api.together.xyz/models',
      'https://api.together.xyz/v1/models',
      'https://api.together.xyz/api/v1/models',
      'https://api.together.ai/v1/models',
      'https://api.together.ai/models'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, { headers: baseHeaders });
        const modelCount = response.data.data?.length || response.data.length || 'unknown';
        console.log(`✅ ${endpoint}: ${response.status} - ${modelCount} models`);
        
        if (modelCount > 100) {
          console.log(`🎯 Found larger model set at: ${endpoint}`);
          
          // Show sample models from this endpoint
          const models = response.data.data || response.data;
          if (Array.isArray(models) && models.length > 0) {
            console.log('📊 Sample models from this endpoint:');
            models.slice(0, 5).forEach((model, index) => {
              console.log(`   ${index + 1}. ${model.id || model.name || 'unknown'}`);
            });
          }
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'failed'} - ${error.message}`);
      }
    }

    // 2. Check if there are query parameters for model types
    console.log('\n2️⃣ Testing model type filters...');
    const modelTypes = ['chat', 'image', 'embedding', 'audio', 'code', 'language'];
    
    for (const type of modelTypes) {
      try {
        const response = await axios.get(`https://api.together.xyz/v1/models?type=${type}`, {
          headers: baseHeaders
        });
        const modelCount = response.data.data?.length || response.data.length || 0;
        console.log(`✅ Type '${type}': ${modelCount} models`);
      } catch (error) {
        console.log(`❌ Type '${type}': failed`);
      }
    }

    // 3. Check the web playground to see what it uses
    console.log('\n3️⃣ Checking web playground endpoints...');
    try {
      // Try the endpoint that the web playground might use
      const playgroundResponse = await axios.get('https://api.together.xyz/v1/models', {
        headers: {
          ...baseHeaders,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://api.together.xyz/'
        }
      });
      console.log(`✅ Playground-style request: ${playgroundResponse.data.data?.length || playgroundResponse.data.length || 'unknown'} models`);
    } catch (error) {
      console.log(`❌ Playground-style request failed: ${error.message}`);
    }

    // 4. Try to get model details for known models that might not be in the list
    console.log('\n4️⃣ Testing known model IDs that might be missing...');
    const knownModels = [
      'meta-llama/Llama-2-7b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-70b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'NousResearch/Nous-Hermes-2-Yi-34B',
      'togethercomputer/RedPajama-INCITE-Chat-3B-v1',
      'WizardLM/WizardLM-70B-V1.0',
      'garage-bAInd/Platypus2-70B-instruct'
    ];

    for (const modelId of knownModels) {
      try {
        // Try to get specific model info
        const response = await axios.get(`https://api.together.xyz/v1/models/${modelId}`, {
          headers: baseHeaders
        });
        console.log(`✅ Found specific model: ${modelId}`);
      } catch (error) {
        console.log(`❌ Model ${modelId}: ${error.response?.status || 'not found'}`);
      }
    }

    // 5. Check if there's a different API for getting all models
    console.log('\n5️⃣ Checking for alternative model discovery endpoints...');
    const altEndpoints = [
      'https://api.together.xyz/v1/models/available',
      'https://api.together.xyz/v1/models/all',
      'https://api.together.xyz/v1/models/list',
      'https://api.together.xyz/inference/models',
      'https://api.together.xyz/models/list'
    ];

    for (const endpoint of altEndpoints) {
      try {
        const response = await axios.get(endpoint, { headers: baseHeaders });
        const modelCount = response.data.data?.length || response.data.length || response.data.models?.length || 'unknown';
        console.log(`✅ ${endpoint}: ${response.status} - ${modelCount} models`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'failed'}`);
      }
    }

    console.log('\n🎉 Full model discovery debugging completed!');
    console.log('💡 If we\'re still only getting ~80 models, it might be:');
    console.log('   - API rate limiting or filtering');
    console.log('   - Account tier restrictions');
    console.log('   - Models are paginated and we need to fetch multiple pages');
    console.log('   - Different endpoint needed for full model list');

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug
if (require.main === module) {
  debugTogetherFullModels().catch(console.error);
}

export { debugTogetherFullModels };
