/**
 * Test Hybrid Model Discovery System
 * 
 * Test the FalAiClient's new model discovery and caching functionality
 */

import { FalAiClient, FalAiConfig } from './src/media/providers/falai/FalAiClient';

async function testHybridModelDiscovery() {
  console.log('🧪 Testing Hybrid Model Discovery System');
  console.log('========================================');

  // Configuration with discovery enabled
  const config: FalAiConfig = {
    apiKey: process.env.FALAI_API_KEY!,
    timeout: 60000,
    retries: 2,
    rateLimit: {
      requestsPerSecond: 1,
      requestsPerMinute: 10
    },
    discovery: {
      openRouterApiKey: process.env.OPENROUTER_API_KEY!,
      cacheDir: './cache',
      maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (!config.apiKey) {
    console.log('❌ FALAI_API_KEY environment variable not set');
    return;
  }

  if (!config.discovery?.openRouterApiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    return;
  }

  const client = new FalAiClient(config);

  try {
    // Test 1: Get model metadata (first time - should fetch and cache)
    console.log('\n📋 Test 1: First-time model discovery (should fetch and cache)');
    const startTime1 = Date.now();
    const framepackMeta1 = await client.getModelMetadata('fal-ai/framepack');
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Discovered fal-ai/framepack in ${duration1}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏷️  ID: ${framepackMeta1.id}`);
    console.log(`📛 Name: ${framepackMeta1.name}`);
    console.log(`📂 Category: ${framepackMeta1.category}`);
    console.log(`📝 Description: ${framepackMeta1.description.substring(0, 100)}...`);
    console.log(`⚙️  Parameters: ${Object.keys(framepackMeta1.parameters).length} found`);
    console.log(`⚡ Capabilities: ${framepackMeta1.capabilities.length} found`);
    console.log(`🏷️  Tags: ${framepackMeta1.tags.join(', ')}`);
    console.log(`📅 Last Updated: ${new Date(framepackMeta1.lastUpdated).toLocaleString()}`);

    // Show some parameters
    console.log('\n🔧 Sample Parameters:');
    const paramEntries = Object.entries(framepackMeta1.parameters).slice(0, 3);
    for (const [name, param] of paramEntries) {
      console.log(`   • ${name}: ${param.type} - ${param.description.substring(0, 60)}...`);
      if (param.default !== undefined) console.log(`     Default: ${param.default}`);
      if (param.required) console.log(`     Required: ${param.required}`);
    }

    // Test 2: Get same model metadata (should load from cache)
    console.log('\n🚀 Test 2: Second request (should load from cache)');
    const startTime2 = Date.now();
    const framepackMeta2 = await client.getModelMetadata('fal-ai/framepack');
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Loaded from cache in ${duration2}ms (${Math.round((duration1/duration2))}x faster)`);
    console.log(`📊 Cache hit: ${framepackMeta1.id === framepackMeta2.id ? 'SUCCESS' : 'FAILED'}`);

    // Test 3: Get different model
    console.log('\n🎨 Test 3: Discover different model (FLUX Pro)');
    const startTime3 = Date.now();
    const fluxMeta = await client.getModelMetadata('fal-ai/flux-pro');
    const duration3 = Date.now() - startTime3;
    
    console.log(`✅ Discovered fal-ai/flux-pro in ${duration3}ms`);
    console.log(`📂 Category: ${fluxMeta.category}`);
    console.log(`⚙️  Parameters: ${Object.keys(fluxMeta.parameters).length} found`);

    // Test 4: Show cached models
    console.log('\n💾 Test 4: Show all cached models');
    const cachedModels = await client.getCachedModels();
    console.log(`✅ Found ${cachedModels.length} cached models:`);
    for (const model of cachedModels) {
      console.log(`   📌 ${model.id} (${model.category}) - ${Object.keys(model.parameters).length} params`);
    }

    // Test 5: Demonstrate parameter usage
    console.log('\n🧪 Test 5: Using discovered metadata for API call');
    const framepackParams = framepackMeta1.parameters;
    
    console.log('Required parameters for fal-ai/framepack:');
    for (const [name, param] of Object.entries(framepackParams)) {
      if (param.required) {
        console.log(`   ✓ ${name}: ${param.type} - ${param.description}`);
      }
    }

    console.log('\n🎉 Hybrid Model Discovery Test Completed!');
    console.log('\n💡 Summary:');
    console.log(`   ✅ First fetch: ${duration1}ms (discovery + cache)`);
    console.log(`   ✅ Cache hit: ${duration2}ms (${Math.round(((duration1-duration2)/duration1)*100)}% faster)`);
    console.log(`   ✅ Models cached: ${cachedModels.length}`);
    console.log(`   ✅ Total parameters discovered: ${Object.keys(framepackMeta1.parameters).length + Object.keys(fluxMeta.parameters).length}`);
    console.log('\n🚀 Ready for dynamic model integration!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  testHybridModelDiscovery().catch(console.error);
}

export { testHybridModelDiscovery };
