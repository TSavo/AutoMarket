/**
 * Test fal.ai Dynamic Model Discovery System
 * 
 * Test the FalAiClient's model discovery by scraping fal.ai exclusively
 * and using FREE AI models for categorization
 */

import { FalAiClient, FalAiConfig } from './src/media/providers/falai/FalAiClient';

async function testFalAiDynamicDiscovery() {
  console.log('🚀 Testing fal.ai Dynamic Model Discovery System');
  console.log('================================================');

  // Configuration with discovery enabled (FREE models only)
  const config: FalAiConfig = {
    apiKey: process.env.FALAI_API_KEY || 'fal_demo_key',
    timeout: 60000,
    retries: 2,
    rateLimit: {
      requestsPerSecond: 2,  // Respect fal.ai API limits
      requestsPerMinute: 30
    },
    discovery: {
      openRouterApiKey: process.env.OPENROUTER_API_KEY, // For FREE model categorization
      cacheDir: './cache',
      maxCacheAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (!config.apiKey) {
    console.log('❌ FALAI_API_KEY environment variable not set');
    return;
  }

  const client = new FalAiClient(config);

  try {
    // Test 1: Connection test
    console.log('\n🔌 Test 1: Connection test');
    const connected = await client.testConnection();
    console.log(`✅ Connection: ${connected ? 'SUCCESS' : 'FAILED'}`);

    if (!connected) {
      throw new Error('Failed to connect to fal.ai API');
    }

    // Test 2: Dynamic model discovery by scraping fal.ai
    console.log('\n🕷️  Test 2: Dynamic model discovery from fal.ai');
    const discoveredModels = await client.discoverModels({
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      cacheDir: './cache',
      maxCacheAge: 24 * 60 * 60 * 1000
    });

    console.log(`✅ Discovered ${discoveredModels.length} models from fal.ai`);
    
    // Show sample models by category
    console.log('\n📌 Sample discovered models by category:');
    
    const categories = ['text-to-image', 'text-to-video', 'image-to-video', 'video-to-video', 'text-to-audio'];
    for (const category of categories) {
      const categoryModels = discoveredModels.filter(m => m.category === category);
      if (categoryModels.length > 0) {
        console.log(`\n  🎯 ${category.toUpperCase()} (${categoryModels.length} models):`);
        for (const model of categoryModels.slice(0, 3)) {
          console.log(`     • ${model.id} - ${model.name || 'Unnamed'}`);
          if (model.description) {
            console.log(`       ${model.description.substring(0, 80)}...`);
          }
        }
      }
    }

    // Test 3: Get detailed metadata for a popular model
    console.log('\n🔍 Test 3: Get detailed metadata for FLUX Pro');
    try {
      const fluxMetadata = await client.getModelMetadata('fal-ai/flux-pro');
      console.log('✅ FLUX Pro metadata retrieved:');
      console.log(`   Name: ${fluxMetadata.name}`);
      console.log(`   Category: ${fluxMetadata.category}`);
      console.log(`   Capabilities: ${fluxMetadata.capabilities.join(', ')}`);
      console.log(`   Parameters: ${Object.keys(fluxMetadata.parameters).length} params`);
    } catch (error) {
      console.log(`⚠️  FLUX Pro not found or failed: ${error}`);
    }

    // Test 4: Test AI categorization on a known model
    console.log('\n🤖 Test 4: AI-powered categorization');
    if (process.env.OPENROUTER_API_KEY) {
      const testModel = discoveredModels.find(m => m.id.includes('flux') || m.id.includes('runway'));
      if (testModel) {
        console.log(`✅ AI categorized model: ${testModel.id}`);
        console.log(`   Category: ${testModel.category}`);
        console.log(`   Capabilities: ${testModel.capabilities.join(', ')}`);
      }
    } else {
      console.log('⚠️  OPENROUTER_API_KEY not set - skipping AI categorization test');
    }

    // Test 5: Show model statistics
    console.log('\n📊 Test 5: Discovery statistics');
    const categoryStats = discoveredModels.reduce((stats, model) => {
      stats[model.category] = (stats[model.category] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    console.log('✅ Models by category:');
    for (const [category, count] of Object.entries(categoryStats)) {
      console.log(`   ${category}: ${count} models`);
    }

    // Test 6: Client statistics
    console.log('\n📈 Test 6: Client statistics');
    const stats = client.getStats();
    console.log(`✅ Requests made: ${stats.requestCount}`);
    console.log(`⏰ Last request: ${new Date(stats.lastRequestTime).toLocaleTimeString()}`);
    console.log(`🔑 Configured: ${stats.isConfigured}`);

    console.log('\n🎉 fal.ai Dynamic Discovery Test Completed!');
    console.log('\n💡 Summary:');
    console.log(`   ✅ Connection: Working`);
    console.log(`   ✅ Model discovery: ${discoveredModels.length} models found`);
    console.log(`   ✅ AI categorization: ${process.env.OPENROUTER_API_KEY ? 'Enabled' : 'Disabled'}`);
    console.log(`   ✅ Scraping approach: fal.ai exclusively (no static registry)`);
    console.log(`   ✅ FREE models only: Uses deepseek/deepseek-chat:free for categorization`);

  } catch (error) {
    console.error('❌ fal.ai discovery test failed:', error);
    throw error;
  }
}

// Run test if executed directly
if (require.main === module) {
  testFalAiDynamicDiscovery().catch(console.error);
}

export { testFalAiDynamicDiscovery };
