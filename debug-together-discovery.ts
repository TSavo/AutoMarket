/**
 * Debug Together AI Model Discovery
 * 
 * Debug the model discovery and classification issues.
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';
import { TogetherAPIClient } from './src/media/clients/TogetherAPIClient';

async function debugTogetherDiscovery() {
  console.log('🔍 Debugging Together AI Model Discovery...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Test API client directly
    console.log('1️⃣ Testing TogetherAPIClient directly...');
    const apiClient = new TogetherAPIClient({
      apiKey: apiKey
    });

    // Test connection
    console.log('🔗 Testing connection...');
    const connectionOk = await apiClient.testConnection();
    console.log(`✅ Connection: ${connectionOk}\n`);

    // Test model fetching
    console.log('📋 Fetching models directly from API...');
    try {
      const models = await apiClient.getAvailableModels();
      console.log(`✅ Retrieved ${models.length} models from API`);
      
      // Show first few models
      console.log('\n📊 Sample models:');
      models.slice(0, 10).forEach((model, index) => {
        console.log(`${index + 1}. ${model.id}`);
        console.log(`   Name: ${model.display_name || 'N/A'}`);
        console.log(`   Type: ${model.object || 'N/A'}`);
        console.log(`   Owner: ${model.owned_by || 'N/A'}`);
        if (model.pricing) {
          console.log(`   Pricing: $${model.pricing.input}/$${model.pricing.output}`);
        }
        console.log();
      });

      // Analyze model types
      console.log('🔍 Analyzing model types...');
      const modelTypes = new Map<string, number>();
      const modelOwners = new Map<string, number>();
      
      models.forEach(model => {
        const type = model.object || 'unknown';
        modelTypes.set(type, (modelTypes.get(type) || 0) + 1);
        
        const owner = model.owned_by || 'unknown';
        modelOwners.set(owner, (modelOwners.get(owner) || 0) + 1);
      });
      
      console.log('\n📈 Model types:');
      Array.from(modelTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
        
      console.log('\n🏢 Model owners:');
      Array.from(modelOwners.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([owner, count]) => {
          console.log(`   ${owner}: ${count}`);
        });

      // Look for image models specifically
      console.log('\n🎨 Looking for image models...');
      const imageModels = models.filter(model => {
        const id = model.id.toLowerCase();
        const name = (model.display_name || '').toLowerCase();
        return id.includes('flux') || 
               id.includes('stable') || 
               id.includes('dall') ||
               name.includes('image') ||
               name.includes('flux');
      });
      
      console.log(`✅ Found ${imageModels.length} potential image models:`);
      imageModels.slice(0, 5).forEach(model => {
        console.log(`   - ${model.id} (${model.display_name || 'N/A'})`);
      });

    } catch (error) {
      console.log(`❌ Model fetching failed: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
    }

    // 2. Test provider discovery
    console.log('\n2️⃣ Testing TogetherProvider discovery...');
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    
    const allModels = provider.models;
    const textModels = provider.getTextModels();
    const imageModels = provider.getImageModels();
    
    console.log(`✅ Provider models: ${allModels.length} total`);
    console.log(`   - Text models: ${textModels.length}`);
    console.log(`   - Image models: ${imageModels.length}`);
    
    // Show some classified models
    console.log('\n📋 Sample classified models:');
    console.log('Text models:');
    textModels.slice(0, 3).forEach(model => {
      console.log(`   - ${model.id} (${model.capabilities.join(', ')})`);
    });
    
    console.log('Image models:');
    imageModels.slice(0, 3).forEach(model => {
      console.log(`   - ${model.id} (${model.capabilities.join(', ')})`);
    });

    // 3. Test image generation API endpoint
    console.log('\n3️⃣ Testing image generation endpoint...');
    try {
      // Try a simple test request to see what the API expects
      const testPayload = {
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt: 'A simple test image',
        width: 512,
        height: 512,
        steps: 4
      };
      
      console.log('🧪 Testing image generation with payload:', JSON.stringify(testPayload, null, 2));
      
      // Make direct API call to debug
      const response = await (apiClient as any).client.post('/images/generations', testPayload);
      console.log(`✅ Image API response: ${response.status}`);
      console.log(`   Data: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`);
      
    } catch (error) {
      console.log(`❌ Image API test failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.log('\n🎉 Discovery debugging completed!');

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug
if (require.main === module) {
  debugTogetherDiscovery().catch(console.error);
}

export { debugTogetherDiscovery };
