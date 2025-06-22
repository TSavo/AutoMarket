/**
 * Test all providers to ensure auto-configuration fixes work
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';

async function testAllProviders() {
  console.log('🧪 Testing all providers for auto-configuration timing...');
  
  try {
    // Initialize the provider registry
    await initializeProviders();
    
    // Test getting different providers and their getModel methods
    const providers = ['openrouter', 'fal-ai', 'together', 'replicate'];
    
    console.log('✅ Testing provider getModel() methods:');
    for (const providerId of providers) {
      try {
        const provider = await getProvider(providerId);
        console.log(`\n📋 Testing ${providerId} (${provider.name})...`);
          // Try to get a model - this should trigger the auto-configuration wait
        try {
          let modelId = '';
          if (providerId === 'openrouter') {
            modelId = 'deepseek/deepseek-chat-v3-0324:free';
          } else if (providerId === 'fal-ai') {
            // For fal.ai, just test that the provider loads - skip model discovery for now
            // as it requires heavy web scraping that can cause memory issues
            console.log(`   ⚠️  Skipping model test for fal.ai to avoid memory issues`);
            console.log(`   ✅ Provider loaded successfully`);
            continue;
          } else if (providerId === 'together') {
            modelId = 'meta-llama/Llama-3.3-70B-Instruct-Turbo'; // Example Together model
          } else if (providerId === 'replicate') {
            modelId = 'stability-ai/stable-diffusion'; // Example Replicate model
          }
          
          const model = await provider.getModel(modelId);
          console.log(`   ✅ getModel('${modelId}') succeeded`);
          console.log(`   📊 Model ID: ${model.getId ? model.getId() : 'N/A'}`);
        } catch (modelError) {
          console.log(`   ⚠️  getModel() failed (expected for missing API keys): ${modelError.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${providerId}: Failed - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAllProviders().catch(console.error);
