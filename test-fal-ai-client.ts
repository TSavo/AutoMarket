/**
 * Test for FalAiClient - Basic functionality verification
 */

import { FalAiClient, FalAiConfig } from './src/media/providers/falai/FalAiClient';

async function testFalAiClient() {
  console.log('🧪 Testing FalAiClient Basic Functionality');
  console.log('==========================================');
  // Test configuration
  const config: FalAiConfig = {
    apiKey: process.env.FALAI_API_KEY || 'fal_test_key_placeholder',
    timeout: 30000,
    retries: 2,
    rateLimit: {
      requestsPerSecond: 1,
      requestsPerMinute: 10
    }
  };

  try {
    // Create client
    console.log('🔧 Creating FalAiClient...');
    const client = new FalAiClient(config);
    
    // Test connection
    console.log('🔍 Testing connection...');
    const isConnected = await client.testConnection();
    console.log(`✅ Connection test: ${isConnected ? 'PASSED' : 'FAILED'}`);
    
    // Test client stats
    console.log('📊 Getting client stats...');
    const stats = client.getStats();
    console.log('Stats:', {
      requestCount: stats.requestCount,
      isConfigured: stats.isConfigured,
      lastRequestTime: stats.lastRequestTime > 0 ? 'Set' : 'Not set'
    });
    
    // Test model info (basic)
    console.log('🎯 Testing model info...');
    try {
      const modelInfo = await client.getModelInfo('fal-ai/framepack');
      console.log('Model info:', modelInfo);
    } catch (error) {
      console.log('Model info test - expected to work but may fail without real API key');
    }
    
    // Test asset upload (mock data)
    console.log('📤 Testing asset upload...');
    try {
      const mockImageData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // Mock JPEG header
      const uploadResult = await client.uploadAsset(mockImageData, 'test.jpg');
      console.log('Upload result:', uploadResult);
    } catch (error) {
      console.log('Asset upload test - expected to fail without real API key:', error instanceof Error ? error.message : error);
    }
    
    console.log('\n✅ FalAiClient basic functionality test completed');
    console.log('💡 Note: Some tests may fail without a valid FAL_API_KEY environment variable');
    
  } catch (error) {
    console.error('❌ FalAiClient test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testFalAiClient().catch(console.error);
}

export { testFalAiClient };
