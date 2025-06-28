/**
 * Test script for WaveSpeedAI dynamic model discovery
 */

import { WaveSpeedClient } from './src/media/providers/wavespeed/WaveSpeedClient';
import { WaveSpeedProvider } from './src/media/providers/wavespeed/WaveSpeedProvider';

async function testWaveSpeedDiscovery() {
  console.log('🚀 Testing WaveSpeedAI Dynamic Model Discovery\n');

  // Test 1: Client-level model discovery
  console.log('1. Testing WaveSpeedClient model discovery...');
  
  try {
    const client = new WaveSpeedClient({
      apiKey: process.env.WAVESPEED_API_KEY || 'demo-key',
      discovery: {
        openRouterApiKey: process.env.OPENROUTER_API_KEY,
        cacheDir: './test-cache',
        maxCacheAge: 60 * 1000 // 1 minute for testing
      }
    });

    // Test connection
    const isConnected = await client.testConnection();
    console.log(`✓ Connection test: ${isConnected ? 'PASSED' : 'FAILED'}`);

    // Test model discovery
    console.log('📡 Discovering models...');
    const discoveredModels = await client.discoverModels();
    
    console.log(`✓ Discovered ${discoveredModels.length} models`);
    console.log('\nSample models:');
    
    discoveredModels.slice(0, 5).forEach(model => {
      console.log(`  - ${model.id}`);
      console.log(`    Category: ${model.category}`);
      console.log(`    Capabilities: ${model.capabilities.join(', ')}`);
      console.log(`    Tags: ${model.tags.join(', ')}`);
      console.log('');
    });

    // Test available models (legacy format)
    console.log('📋 Testing getAvailableModels (legacy format)...');
    const availableModels = await client.getAvailableModels();
    console.log(`✓ Available models: ${availableModels.length}`);

  } catch (error) {
    console.error('❌ Client test failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Provider-level integration
  console.log('2. Testing WaveSpeedProvider integration...');
  
  try {
    const provider = new WaveSpeedProvider();
    
    // Configure provider
    await provider.configure({
      apiKey: process.env.WAVESPEED_API_KEY || 'demo-key'
    });

    console.log(`✓ Provider configured`);
    console.log(`✓ Capabilities: ${provider.capabilities.join(', ')}`);
    console.log(`✓ Models loaded: ${provider.models.length}`);

    // Test provider health
    const health = await provider.getHealth();
    console.log(`✓ Provider health: ${health.status}`);

    // Show model categories
    const categories = new Set(provider.models.map(m => m.capabilities).flat());
    console.log(`✓ Model categories: ${Array.from(categories).join(', ')}`);

  } catch (error) {
    console.error('❌ Provider test failed:', error);
  }

  console.log('\n✅ WaveSpeedAI Discovery Test Complete!');
}

// Run the test
testWaveSpeedDiscovery().catch(console.error);
