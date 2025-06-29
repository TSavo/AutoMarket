/**
 * Debug Provider Registration
 * 
 * Check which providers are actually registered in the system.
 */

import { ProviderRegistry } from './src/media/registry/ProviderRegistry';
import { MediaCapability } from './src/media/types/provider';

// Import all providers to ensure they register themselves
import './src/media/providers';

async function debugProviderRegistration() {
  console.log('🔍 DEBUGGING PROVIDER REGISTRATION');
  console.log('=================================\n');

  const registry = ProviderRegistry.getInstance();  // Get all registered providers
  console.log('📋 ALL REGISTERED PROVIDERS:');
  const allProviders = await registry.getProviders();
  console.log(`   Total providers: ${allProviders.length}`);
  
  allProviders.forEach((provider, index) => {
    console.log(`   ${index + 1}. ${provider.name} (${provider.id})`);
    console.log(`      Type: ${provider.type}`);
    console.log(`      Capabilities: ${provider.capabilities.join(', ')}`);
    console.log('');
  });

  // Check specifically for VIDEO_TO_IMAGE capability
  console.log('🎬 PROVIDERS WITH VIDEO_TO_IMAGE CAPABILITY:');
  try {
    const videoToImageProvider = await registry.findBestProvider(MediaCapability.VIDEO_TO_IMAGE);
    if (videoToImageProvider) {
      console.log(`   ✅ Found: ${videoToImageProvider.name} (${videoToImageProvider.id})`);
      console.log(`   Capabilities: ${videoToImageProvider.capabilities.join(', ')}`);
      
      // Check if it has the required methods
      if ('getSupportedVideoToImageModels' in videoToImageProvider) {
        const models = (videoToImageProvider as any).getSupportedVideoToImageModels();
        console.log(`   Models: ${models.join(', ')}`);
      }
    } else {
      console.log('   ❌ No provider found');
    }
  } catch (error) {
    console.log(`   ❌ Error finding provider: ${error.message}`);
  }

  // Check providers by capability
  console.log('\n📊 PROVIDERS BY CAPABILITY:');
  const capabilities = Object.values(MediaCapability);
  
  for (const capability of capabilities) {
    try {
      const provider = await registry.findBestProvider(capability);
      if (provider) {
        console.log(`   ${capability}: ${provider.name} (${provider.id})`);
      } else {
        console.log(`   ${capability}: No provider`);
      }
    } catch (error) {
      console.log(`   ${capability}: Error - ${error.message}`);
    }
  }

  // Check for FFmpeg provider specifically
  console.log('\n🔧 FFMPEG PROVIDER CHECK:');
  const ffmpegProvider = allProviders.find(p => p.id === 'ffmpeg');
  if (ffmpegProvider) {
    console.log(`   ✅ FFMPEGProvider is registered!`);
    console.log(`   Name: ${ffmpegProvider.name}`);
    console.log(`   Type: ${ffmpegProvider.type}`);
    console.log(`   Capabilities: ${ffmpegProvider.capabilities.join(', ')}`);
    
    // Check if it includes VIDEO_TO_IMAGE
    if (ffmpegProvider.capabilities.includes(MediaCapability.VIDEO_TO_IMAGE)) {
      console.log('   ✅ Includes VIDEO_TO_IMAGE capability');
    } else {
      console.log('   ❌ Missing VIDEO_TO_IMAGE capability');
    }
  } else {
    console.log('   ❌ FFMPEGProvider is NOT registered');
    console.log('   Available provider IDs:', allProviders.map(p => p.id).join(', '));
  }
}

if (require.main === module) {
  debugProviderRegistration().catch(console.error);
}

export { debugProviderRegistration };
