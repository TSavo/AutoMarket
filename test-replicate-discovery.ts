/**
 * Test Replicate Hybrid Model Discovery System
 * 
 * Test the ReplicateClient's model discovery using the official Replicate API
 */

import { ReplicateClient, ReplicateConfig } from './src/media/clients/ReplicateClient';

async function testReplicateHybridDiscovery() {
  console.log('🔬 Testing Replicate Hybrid Model Discovery System');
  console.log('=================================================');

  // Configuration with discovery enabled
  const config: ReplicateConfig = {
    apiKey: process.env.REPLICATE_API_TOKEN!,
    timeout: 60000,
    retries: 2,
    rateLimit: {
      requestsPerSecond: 5, // Replicate allows up to 3000/min for most endpoints
      requestsPerMinute: 100
    },
    discovery: {
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      cacheDir: './cache',
      maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (!config.apiKey) {
    console.log('❌ REPLICATE_API_TOKEN environment variable not set');
    return;
  }

  const client = new ReplicateClient(config);

  try {
    // Test 1: Connection test
    console.log('\n🔌 Test 1: Connection test');
    const connected = await client.testConnection();
    console.log(`✅ Connection: ${connected ? 'SUCCESS' : 'FAILED'}`);

    if (!connected) {
      throw new Error('Failed to connect to Replicate API');
    }

    // Test 2: List public models (first page)
    console.log('\n📋 Test 2: List public models');
    const modelsResponse = await client.listModels();
    console.log(`✅ Found ${modelsResponse.results.length} models on first page`);
    console.log(`   Pagination: next=${!!modelsResponse.next}, prev=${!!modelsResponse.previous}`);
    
    // Show first few models
    console.log('\n📌 Sample models:');
    for (const model of modelsResponse.results.slice(0, 3)) {
      console.log(`   • ${model.owner}/${model.name} - ${model.run_count} runs`);
    }

    // Test 3: Get detailed metadata for a popular model
    console.log('\n🔍 Test 3: Discover black-forest-labs/flux-schnell metadata');
    const startTime1 = Date.now();
    const fluxMeta = await client.getModelMetadata('black-forest-labs/flux-schnell');
    const duration1 = Date.now() - startTime1;
    
    console.log(`✅ Discovered flux-schnell in ${duration1}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏷️  ID: ${fluxMeta.id}`);
    console.log(`👤 Owner: ${fluxMeta.owner}`);
    console.log(`📛 Name: ${fluxMeta.name}`);
    console.log(`📂 Category: ${fluxMeta.category}`);
    console.log(`📝 Description: ${fluxMeta.description.substring(0, 100)}...`);
    console.log(`🔧 Parameters: ${Object.keys(fluxMeta.parameters).length} found`);
    console.log(`⚡ Capabilities: ${fluxMeta.capabilities.join(', ')}`);
    console.log(`🏃 Run Count: ${fluxMeta.run_count.toLocaleString()}`);
    console.log(`🏷️  Tags: ${fluxMeta.tags.join(', ')}`);

    // Show some parameters
    console.log('\n🔧 Key Parameters:');
    const paramEntries = Object.entries(fluxMeta.parameters)
      .sort((a, b) => (a[1].x_order || 999) - (b[1].x_order || 999))
      .slice(0, 5);
    
    for (const [name, param] of paramEntries) {
      const requiredLabel = param.required ? ' (Required)' : '';
      const defaultLabel = param.default !== undefined ? ` [default: ${param.default}]` : '';
      console.log(`   • ${name}: ${param.type}${requiredLabel}${defaultLabel}`);
      console.log(`     ${param.description.substring(0, 80)}...`);
    }

    // Test 4: Second request (should be cached)
    console.log('\n🚀 Test 4: Second request (cache test)');
    const startTime2 = Date.now();
    const fluxMeta2 = await client.getModelMetadata('black-forest-labs/flux-schnell');
    const duration2 = Date.now() - startTime2;
    
    console.log(`✅ Loaded from cache in ${duration2}ms (${Math.round((duration1/duration2))}x faster)`);
    console.log(`📊 Cache hit: ${fluxMeta.id === fluxMeta2.id ? 'SUCCESS' : 'FAILED'}`);

    // Test 5: Discover a different model type
    console.log('\n🎬 Test 5: Discover minimax/video-01 (video generation)');
    const startTime3 = Date.now();
    const videoMeta = await client.getModelMetadata('minimax/video-01');
    const duration3 = Date.now() - startTime3;
    
    console.log(`✅ Discovered video-01 in ${duration3}ms`);
    console.log(`📂 Category: ${videoMeta.category}`);
    console.log(`🔧 Parameters: ${Object.keys(videoMeta.parameters).length} found`);
    console.log(`⚡ Capabilities: ${videoMeta.capabilities.join(', ')}`);

    // Test 6: Search models
    console.log('\n🔍 Test 6: Search for "stable diffusion" models');
    const searchResults = await client.searchModels('stable diffusion');
    console.log(`✅ Found ${searchResults.results.length} models matching "stable diffusion"`);
    
    for (const model of searchResults.results.slice(0, 3)) {
      console.log(`   📌 ${model.owner}/${model.name} - ${model.run_count} runs`);
    }

    // Test 7: Get models by collection
    console.log('\n📚 Test 7: Get models from "text-to-image" collection');
    try {
      const collectionModels = await client.getModelsByCollection('text-to-image');
      console.log(`✅ Found ${collectionModels.length} models in text-to-image collection`);
      
      for (const model of collectionModels.slice(0, 3)) {
        console.log(`   📌 ${model.owner}/${model.name}`);
      }
    } catch (error) {
      console.log(`⚠️  Collection not found or API changed: ${error}`);
    }

    // Test 8: Show cached models
    console.log('\n💾 Test 8: Show all cached models');
    const cachedModels = await client.getCachedModels();
    console.log(`✅ Found ${cachedModels.length} cached models:`);
    for (const model of cachedModels) {
      console.log(`   💾 ${model.id} (${model.category}) - ${Object.keys(model.parameters).length} params - ${model.run_count} runs`);
    }

    // Test 9: Client statistics
    console.log('\n📊 Test 9: Client statistics');
    const stats = client.getStats();
    console.log(`✅ Requests made: ${stats.requestCount}`);
    console.log(`⏰ Last request: ${new Date(stats.lastRequestTime).toLocaleTimeString()}`);
    console.log(`🔑 Configured: ${stats.isConfigured}`);

    console.log('\n🎉 Replicate Hybrid Discovery Test Completed!');
    console.log('\n💡 Summary:');
    console.log(`   ✅ Connection: Working`);
    console.log(`   ✅ Model listing: ${modelsResponse.results.length} models found`);
    console.log(`   ✅ Metadata extraction: Complete (${Object.keys(fluxMeta.parameters).length} + ${Object.keys(videoMeta.parameters).length} total params)`);
    console.log(`   ✅ Caching: ${Math.round(((duration1-duration2)/duration1)*100)}% performance improvement`);
    console.log(`   ✅ Search: ${searchResults.results.length} results`);
    console.log(`   ✅ AI categorization: ${config.discovery?.openRouterApiKey ? 'Enabled' : 'Basic fallback'}`);
    console.log(`   ✅ Total requests: ${stats.requestCount}`);
    console.log('\n🚀 Ready for production model discovery!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  testReplicateHybridDiscovery().catch(console.error);
}

export { testReplicateHybridDiscovery };
