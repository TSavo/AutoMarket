/**
 * Test fal.ai provider basic functionality without heavy discovery
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';

async function testFalAiBasic() {
  console.log('🧪 Testing fal.ai provider basic functionality...');
  
  try {
    // Initialize the provider registry
    await initializeProviders();
    
    // Get the fal.ai provider
    const provider = await getProvider('fal-ai');
    console.log(`✅ Got fal.ai provider: ${provider.name}`);
    console.log(`   Provider ID: ${provider.id}`);
    console.log(`   Provider type: ${provider.type}`);
    console.log(`   Provider capabilities: ${provider.capabilities.join(', ')}`);
    
    // Test provider availability
    console.log('\n🔍 Testing provider availability...');
    try {
      const isAvailable = await provider.isAvailable();
      console.log(`   Provider available: ${isAvailable}`);
    } catch (availError) {
      console.log(`   Availability check failed: ${availError.message}`);
    }
    
    // Test provider health
    console.log('\n🏥 Testing provider health...');
    try {
      const health = await provider.getHealth();
      console.log(`   Health status: ${health.status}`);
      console.log(`   Uptime: ${health.uptime}s`);
    } catch (healthError) {
      console.log(`   Health check failed: ${healthError.message}`);
    }
    
    // Test getting models by capability
    console.log('\n📋 Testing capability-based model retrieval...');
    const textToImageModels = provider.getModelsForCapability('text-to-image' as any);
    console.log(`   Text-to-image models: ${textToImageModels.length}`);
    
    // Test if the provider has the expected methods
    console.log('\n🔧 Provider method availability:');
    console.log(`   - getModel: ${typeof provider.getModel}`);
    console.log(`   - getModelsForCapability: ${typeof provider.getModelsForCapability}`);
    console.log(`   - isAvailable: ${typeof provider.isAvailable}`);
    console.log(`   - getHealth: ${typeof provider.getHealth}`);
    console.log(`   - configure: ${typeof provider.configure}`);
    
    // Check if provider has the role-based methods (should be mixed in)
    const providerAny = provider as any;
    console.log('\n🎭 Role-based method availability:');
    console.log(`   - createTextToImageModel: ${typeof providerAny.createTextToImageModel}`);
    console.log(`   - createTextToVideoModel: ${typeof providerAny.createTextToVideoModel}`);
    console.log(`   - createVideoToVideoModel: ${typeof providerAny.createVideoToVideoModel}`);
    console.log(`   - createTextToAudioModel: ${typeof providerAny.createTextToAudioModel}`);
    
    console.log('\n✅ Basic provider functionality test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testFalAiBasic().catch(console.error);
