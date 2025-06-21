/**
 * Real API Test - FalAiClient with actual fal.ai calls
 */

import { FalAiClient, FalAiConfig } from './src/media/providers/falai/FalAiClient';

async function testRealApiCall() {
  console.log('🚀 Testing FalAiClient with Real API Calls');
  console.log('============================================');

  const config: FalAiConfig = {
    apiKey: process.env.FALAI_API_KEY!,
    timeout: 120000, // 2 minutes for real API calls
    retries: 2,
    rateLimit: {
      requestsPerSecond: 1,
      requestsPerMinute: 10
    }
  };

  if (!config.apiKey || config.apiKey === 'fal_test_key_placeholder') {
    console.log('❌ FALAI_API_KEY environment variable not set');
    return;
  }

  const client = new FalAiClient(config);

  // Test 1: Simple image generation with FLUX
  console.log('\n🎨 Test 1: FLUX Pro Image Generation');
  try {
    const imageRequest = {
      model: 'fal-ai/flux-pro',
      input: {
        prompt: 'A cute cartoon cat sitting on a cushion, digital art style',
        image_size: 'square_hd',
        num_inference_steps: 25,
        guidance_scale: 3.5,
        num_images: 1
      },
      logs: true
    };

    console.log('Sending request to fal.ai...');
    console.log('Model:', imageRequest.model);
    console.log('Prompt:', imageRequest.input.prompt);
    
    const result = await client.invoke(imageRequest);
    
    console.log('✅ Image generation successful!');
    console.log('Request ID:', result.requestId);
    console.log('Generation time:', result.metrics?.duration, 'ms');
    console.log('Estimated cost: $', result.metrics?.cost);
    
    if (result.data && result.data.images && result.data.images[0]) {
      console.log('Generated image URL:', result.data.images[0].url);
      console.log('Image dimensions:', result.data.images[0].width, 'x', result.data.images[0].height);
    }
    
  } catch (error) {
    console.error('❌ Image generation failed:', error);
  }

  // Show final stats
  console.log('\n📊 Final Client Statistics');
  const stats = client.getStats();
  console.log('Total requests made:', stats.requestCount);
  console.log('Last request time:', new Date(stats.lastRequestTime).toLocaleTimeString());
  console.log('Client configured:', stats.isConfigured);

  console.log('\n🎉 Real API test completed!');
}

// Run test
if (require.main === module) {
  testRealApiCall().catch(console.error);
}

export { testRealApiCall };
