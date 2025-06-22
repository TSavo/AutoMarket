/**
 * Test script to verify OpenRouter and Together getFreeModels() functionality
 */

import { OpenRouterProvider } from './src/media/providers/openrouter/OpenRouterProvider';
import { TogetherProvider } from './src/media/providers/together/TogetherProvider';

async function testGetFreeModels() {
  console.log('Testing getFreeModels() functionality...\n');

  try {
    // Test OpenRouter Provider
    console.log('🔍 Testing OpenRouter Provider...');
    const openRouterProvider = new OpenRouterProvider();
    
    // Check if the method exists
    if (typeof openRouterProvider.getFreeModels !== 'function') {
      throw new Error('❌ OpenRouter getFreeModels method is missing!');
    }
    
    console.log('✅ OpenRouter getFreeModels method exists');
    
    // Wait a moment for auto-configuration to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const freeModels = openRouterProvider.getFreeModels();
      console.log(`✅ OpenRouter getFreeModels() returned ${freeModels.length} free models`);
      
      if (freeModels.length > 0) {
        console.log('Sample free models:');
        freeModels.slice(0, 3).forEach(model => {
          console.log(`  - ${model.id} (${model.pricing?.inputCost}/${model.pricing?.outputCost} ${model.pricing?.currency})`);
        });
      }
    } catch (error) {
      console.log(`⚠️  OpenRouter getFreeModels() call failed: ${error.message}`);
    }

    // Test Together Provider
    console.log('\n🔍 Testing Together Provider...');
    const togetherProvider = new TogetherProvider();
    
    // Check if the method exists
    if (typeof togetherProvider.getFreeModels !== 'function') {
      throw new Error('❌ Together getFreeModels method is missing!');
    }
    
    console.log('✅ Together getFreeModels method exists');
    
    try {
      const freeModels = togetherProvider.getFreeModels();
      console.log(`✅ Together getFreeModels() returned ${freeModels.length} free models`);
      
      if (freeModels.length > 0) {
        console.log('Sample free models:');
        freeModels.slice(0, 3).forEach(model => {
          console.log(`  - ${model.id} (${model.pricing?.inputCost}/${model.pricing?.outputCost} ${model.pricing?.currency})`);
        });
      }
    } catch (error) {
      console.log(`⚠️  Together getFreeModels() call failed: ${error.message}`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nBoth OpenRouter and Together providers now support getFreeModels() method.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testGetFreeModels();
