/**
 * Test fal.ai memory usage with detailed debugging
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';

function logMemory(label: string) {
  const mem = process.memoryUsage();
  console.log(`🧠 ${label}:`);
  console.log(`   Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)}MB`);
  console.log(`   RSS: ${Math.round(mem.rss / 1024 / 1024)}MB`);
  console.log(`   External: ${Math.round(mem.external / 1024 / 1024)}MB`);
  console.log(`   Array Buffers: ${Math.round(mem.arrayBuffers / 1024 / 1024)}MB`);
}

async function testFalAiMemory() {
  console.log('🧪 Testing fal.ai provider memory usage...');
  
  logMemory('START');
  
  try {
    // Initialize the provider registry
    await initializeProviders();
    logMemory('After provider initialization');
    
    // Get the fal.ai provider
    const provider = await getProvider('fal-ai');
    console.log(`✅ Got fal.ai provider: ${provider.name}`);
    logMemory('After getting provider');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logMemory('After manual GC');
    }
    
    // Try to get an uncached model that will trigger discovery
    console.log('\n📋 Testing uncached model (will trigger web scraping)...');
    const testModelId = 'fal-ai/fast-sdxl'; // This should be uncached
    
    logMemory('Before model discovery');
    
    try {
      console.log(`🔍 Getting model: ${testModelId}`);
      const model = await provider.getModel(testModelId);
      console.log(`✅ Successfully created model instance`);
      logMemory('After successful model creation');
      
    } catch (modelError) {
      console.log(`❌ Failed to get model: ${modelError.message}`);
      logMemory('After model error');
    }
    
    // Force GC again
    if (global.gc) {
      global.gc();
      logMemory('After final GC');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    logMemory('After test error');
  }
}

// Enable manual GC if possible
if (process.argv.includes('--expose-gc')) {
  console.log('🗑️  Manual garbage collection enabled');
}

// Run the test
testFalAiMemory().catch(error => {
  console.error('Fatal error:', error);
  logMemory('After fatal error');
});
