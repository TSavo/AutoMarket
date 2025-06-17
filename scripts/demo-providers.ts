#!/usr/bin/env tsx
/**
 * AutoMarket Provider System Demonstration
 * 
 * This script demonstrates the new capability-driven provider architecture
 */

import { 
  createProviderRegistry, 
  demonstrateProviders,
  MediaCapability,
  ProviderType 
} from '../packages/providers/src';

async function main() {
  console.log('🎬 AutoMarket Provider System Demo\n');
  console.log('=' .repeat(50));
  
  try {
    // Create provider registry with environment-based configuration
    console.log('📦 Initializing Provider Registry...\n');
    const registry = await createProviderRegistry();
    
    // Show provider statistics
    const stats = registry.getStats();
    console.log('📊 Registry Statistics:');
    console.log(`   Total Providers: ${stats.totalProviders}`);
    console.log(`   Local Providers: ${stats.localProviders}`);
    console.log(`   Remote Providers: ${stats.remoteProviders}\n`);
    
    // List all providers and their capabilities
    console.log('🔍 Available Providers:\n');
    const providers = registry.getProviders();
    
    providers.forEach(provider => {
      console.log(`📦 ${provider.name} (${provider.type})`);
      console.log(`   ID: ${provider.id}`);
      console.log(`   Capabilities: ${provider.capabilities.length}`);
      
      provider.capabilities.forEach(capability => {
        const models = provider.getModelsForCapability(capability);
        console.log(`     • ${capability}: ${models.length} model${models.length > 1 ? 's' : ''}`);
      });
      console.log('');
    });
    
    // Demonstrate capability-based selection
    console.log('🎯 Capability-Based Provider Selection:\n');
    
    const testCapabilities = [
      MediaCapability.IMAGE_GENERATION,
      MediaCapability.TEXT_TO_SPEECH,
      MediaCapability.VIDEO_ANIMATION,
      MediaCapability.AVATAR_GENERATION
    ];
    
    for (const capability of testCapabilities) {
      console.log(`🔍 ${capability}:`);
      const availableProviders = registry.getProvidersForCapability(capability);
      
      if (availableProviders.length > 0) {
        availableProviders.forEach(provider => {
          const models = provider.getModelsForCapability(capability);
          console.log(`   ✅ ${provider.name}: ${models.map(m => m.name).join(', ')}`);
        });
      } else {
        console.log(`   ❌ No providers available`);
      }
      console.log('');
    }
    
    // Demonstrate intelligent provider selection
    console.log('🧠 Intelligent Provider Selection:\n');
    
    // Prefer local providers for TTS
    const localTTS = await registry.findBestProvider(MediaCapability.TEXT_TO_SPEECH, {
      preferLocal: true
    });
    
    if (localTTS) {
      console.log(`✅ Best TTS (prefer local): ${localTTS.name} (${localTTS.type})`);
    } else {
      console.log(`❌ No local TTS providers available`);
    }
    
    // Find cost-effective image generation
    const cheapImage = await registry.findBestProvider(MediaCapability.IMAGE_GENERATION, {
      maxCost: 0.10
    });
    
    if (cheapImage) {
      console.log(`✅ Best image generation (max $0.10): ${cheapImage.name}`);
    } else {
      console.log(`❌ No cost-effective image generation providers`);
    }
    
    // Find any video animation provider
    const videoAnimation = await registry.findBestProvider(MediaCapability.VIDEO_ANIMATION);
    
    if (videoAnimation) {
      console.log(`✅ Best video animation: ${videoAnimation.name}`);
    } else {
      console.log(`❌ No video animation providers available`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✨ Provider System Demo Complete!\n');
    
    // Show example usage
    console.log('💡 Example Usage:\n');
    console.log(`// Generate an image using the best available provider
const imageProvider = await registry.findBestProvider(MediaCapability.IMAGE_GENERATION);
if (imageProvider) {
  const result = await imageProvider.generate({
    capability: MediaCapability.IMAGE_GENERATION,
    modelId: 'flux-1.1-pro-ultra',
    parameters: {
      prompt: 'A beautiful sunset over mountains',
      width: 1024,
      height: 1024
    }
  });
  console.log('Generated image:', result.outputs?.[0]?.url);
}

// Generate TTS using local provider if available
const ttsProvider = await registry.findBestProvider(MediaCapability.TEXT_TO_SPEECH, {
  preferLocal: true
});
if (ttsProvider) {
  const result = await ttsProvider.generate({
    capability: MediaCapability.TEXT_TO_SPEECH,
    modelId: 'chatterbox-standard',
    parameters: {
      text: 'Hello from AutoMarket!',
      voice: 'en-US-AriaNeural'
    }
  });
  console.log('Generated audio:', result.outputs?.[0]?.data);
}`);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as demoProviders };
