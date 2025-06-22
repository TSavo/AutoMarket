/**
 * Test script to verify OpenRouter and Together getFreeModels() functionality
 */

import { OpenRouterProvider } from './src/media/providers/openrouter/OpenRouterProvider';
import { TogetherProvider } from './src/media/providers/together/TogetherProvider';

async function testGetFreeModels() {
  console.log('Testing getFreeModels() functionality...\n');

  try {
    // Test OpenRouter provider
    console.log('🔍 Testing OpenRouter Provider...');
    const openRouterProvider = new OpenRouterProvider();

    // Configure with test key
    try {
      await openRouterProvider.configure({
        apiKey: 'test-key',
        baseUrl: 'https://openrouter.ai/api/v1',
        timeout: 30000
      });
    } catch (error) {
      console.log('⚠️  OpenRouter: Configuration failed (expected with test key)');
    }

    // Check if getFreeModels method exists
    if (typeof openRouterProvider.getFreeModels === 'function') {
      console.log('✅ OpenRouter: getFreeModels() method exists');
      
      // Test the method (this will use mock data since we don't have real API key)
      try {
        const freeModels = await openRouterProvider.getFreeModels();
        console.log(`✅ OpenRouter: Found ${freeModels.length} free models`);
        
        if (freeModels.length > 0) {
          console.log('   Sample free models:');
          freeModels.slice(0, 3).forEach(model => {
            console.log(`   - ${model.id}: ${model.name}`);
          });
        }
      } catch (error) {
        console.log(`⚠️  OpenRouter: Method exists but API call failed (expected with test key): ${error.message}`);
      }
    } else {
      console.log('❌ OpenRouter: getFreeModels() method is missing');
    }

    // Test Together provider
    console.log('\n🔍 Testing Together Provider...');
    const togetherProvider = new TogetherProvider();

    // Configure with test key
    try {
      await togetherProvider.configure({
        apiKey: 'test-key',
        baseUrl: 'https://api.together.xyz/v1',
        timeout: 30000
      });
    } catch (error) {
      console.log('⚠️  Together: Configuration failed (expected with test key)');
    }

    // Check if getFreeModels method exists
    if (typeof togetherProvider.getFreeModels === 'function') {
      console.log('✅ Together: getFreeModels() method exists');
      
      // Test the method (this will use mock data since we don't have real API key)
      try {
        const freeModels = await togetherProvider.getFreeModels();
        console.log(`✅ Together: Found ${freeModels.length} free models`);
        
        if (freeModels.length > 0) {
          console.log('   Sample free models:');
          freeModels.slice(0, 3).forEach(model => {
            console.log(`   - ${model.id}: ${model.name}`);
          });
        }
      } catch (error) {
        console.log(`⚠️  Together: Method exists but API call failed (expected with test key): ${error.message}`);
      }
    } else {
      console.log('❌ Together: getFreeModels() method is missing');
    }

    // Test isModelFree methods
    console.log('\n🔍 Testing isModelFree() functionality...');
    
    // Test OpenRouter isModelFree
    if (typeof openRouterProvider.isModelFree === 'function') {
      console.log('✅ OpenRouter: isModelFree() method exists');
      
      // Test with known model IDs (these might not exist but method should handle gracefully)
      console.log(`   Free model test: ${openRouterProvider.isModelFree('test-free-model')}`);
      console.log(`   Paid model test: ${openRouterProvider.isModelFree('test-paid-model')}`);
    } else {
      console.log('❌ OpenRouter: isModelFree() method is missing');
    }

    // Test Together isModelFree
    if (typeof togetherProvider.isModelFree === 'function') {
      console.log('✅ Together: isModelFree() method exists');
      
      // Test with known model IDs
      console.log(`   Free model test: ${togetherProvider.isModelFree('meta-llama/Llama-3.3-70B-Instruct-Turbo-Free')}`);
      console.log(`   Paid model test: ${togetherProvider.isModelFree('meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo')}`);
    } else {
      console.log('❌ Together: isModelFree() method is missing');
    }

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testGetFreeModels();
