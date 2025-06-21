/**
 * Explore fal.ai API for Model Discovery
 */

import * as falLib from '@fal-ai/client';

const fal = falLib.fal;

async function exploreApiDiscovery() {
  console.log('🔍 Exploring fal.ai API for Model Discovery');
  console.log('===========================================');

  // Configure with our API key
  fal.config({
    credentials: process.env.FALAI_API_KEY!
  });

  console.log('\n1. Testing known model endpoints to understand response structure');
  
  // Test 1: Try to get schema/info from a known model
  console.log('\n🎯 Test 1: Checking if models have discoverable schemas');
  try {
    // Try calling a model with empty/invalid input to see what error info we get
    const result = await fal.run('fal-ai/flux-pro', {
      input: {}  // Empty input to trigger validation error
    });
    console.log('Unexpected success with empty input:', result);
  } catch (error: any) {
    console.log('Error response (may contain schema info):');
    console.log('- Error type:', error.constructor.name);
    console.log('- Error message:', error.message);
    console.log('- Error details:', error.body || error.detail || 'No additional details');
    
    // Check if error contains schema information
    if (error.body && typeof error.body === 'object') {
      console.log('- Full error body:', JSON.stringify(error.body, null, 2));
    }
  }

  // Test 2: Try some endpoint discovery patterns
  console.log('\n🎯 Test 2: Testing potential discovery endpoints');
  
  const discoveryAttempts = [
    'fal-ai/models',
    'fal-ai/list',
    'fal-ai/discover',
    'models',
    'list',
    'catalog'
  ];

  for (const endpoint of discoveryAttempts) {
    try {
      console.log(`\nTrying endpoint: ${endpoint}`);
      const result = await fal.run(endpoint, { input: {} });
      console.log('✅ SUCCESS:', endpoint, result);
    } catch (error: any) {
      console.log(`❌ Failed: ${endpoint} - ${error.message}`);
    }
  }

  // Test 3: Check if we can introspect model capabilities by trying different models
  console.log('\n🎯 Test 3: Testing known models to understand their interfaces');
  
  const knownModels = [
    'fal-ai/flux-pro',
    'fal-ai/framepack', 
    'fal-ai/face-swap',
    'fal-ai/runway-gen3'
  ];

  for (const modelId of knownModels) {
    try {
      console.log(`\nTesting model: ${modelId}`);
      // Try with minimal input to see what's required
      const result = await fal.run(modelId, {
        input: { prompt: 'test' }  // Most models need at least a prompt
      });
      console.log(`✅ ${modelId} accepts minimal input:`, typeof result);
    } catch (error: any) {
      console.log(`❌ ${modelId} error:`, error.message);
      
      // Look for validation errors that might reveal schema
      if (error.message.includes('required') || error.message.includes('missing')) {
        console.log(`  📋 Possible required fields info in error`);
      }
    }
  }

  // Test 4: Check the fal.ai website/docs endpoints programmatically
  console.log('\n🎯 Test 4: Checking for API metadata endpoints');
  
  try {
    // Some APIs expose OpenAPI specs or similar
    const metadataAttempts = [
      'openapi.json',
      'swagger.json',
      'api/v1/models',
      'api/models',
      'v1/models'
    ];
    
    for (const endpoint of metadataAttempts) {
      try {
        const result = await fal.run(endpoint, { input: {} });
        console.log(`✅ Metadata endpoint found: ${endpoint}`, result);
      } catch (error: any) {
        console.log(`❌ No metadata at: ${endpoint}`);
      }
    }
  } catch (error) {
    console.log('Metadata discovery failed');
  }

  console.log('\n📊 Discovery Summary');
  console.log('===================');
  console.log('Based on this exploration, we can determine:');
  console.log('1. What model endpoints exist and respond');
  console.log('2. What error messages reveal about required parameters');
  console.log('3. What response structures look like');
  console.log('4. Whether any discovery/listing endpoints exist');
}

// Run exploration
if (require.main === module) {
  exploreApiDiscovery().catch(console.error);
}

export { exploreApiDiscovery };
