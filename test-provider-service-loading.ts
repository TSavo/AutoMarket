/**
 * Test Provider → Service Dynamic Loading
 * 
 * Demonstrates how providers can dynamically load and manage their service dependencies
 */

import { ProviderRegistry } from './src/media/registry/ProviderRegistry';
import { ServiceRegistry } from './src/media/registry/ServiceRegistry';
import { DockerMediaProvider } from './src/media/providers/docker/DockerMediaProvider';
import { DockerComposeService } from './src/services/DockerComposeService';

async function testProviderServiceDynamicLoading() {
  console.log('🧪 Testing Provider → Service Dynamic Loading\n');

  // Initialize registries (no explicit initialization needed anymore)
  console.log('📦 REGISTRIES ARE LAZILY INITIALIZED:');
  console.log('=====================================');
  
  const providerRegistry = ProviderRegistry.getInstance();
  const serviceRegistry = ServiceRegistry.getInstance();

  console.log('\n🔄 TESTING DYNAMIC SERVICE LOADING:');
  console.log('====================================');

  // First, let's see what providers are actually available
  console.log('0. Checking available providers...');
  try {
    const availableProviders = providerRegistry.getAvailableProviders();
    console.log(`   Available providers: ${availableProviders.join(', ')}`);
  } catch (error) {
    console.log(`   ❌ Failed to list providers: ${error.message}`);
  }

  // Test 1: Provider loads static service  
  console.log('\n1. Testing provider with static service dependency...');
  
  try {
    // Get FFMPEG provider (use the actual registered name)
    const ffmpegProvider = await providerRegistry.getProvider('ffmpeg');
    
    // Configure it to use a static service
    await ffmpegProvider.configure({
      serviceUrl: 'github:tsavo/prizm-ffmpeg-service',  // Use a GitHub URL for a static service
      autoStartService: false       // Don't actually start for this demo
    });
    
    // Verify that the provider now has a DockerComposeService manager
    const dockerServiceManager = (ffmpegProvider as any).dockerServiceManager; // Access private property for testing
    if (!(dockerServiceManager instanceof DockerComposeService)) {
      throw new Error('FFMPEGProvider did not get a DockerComposeService manager');
    }
    console.log(`   ✅ Provider configured with static service successfully`);
    
  } catch (error) {
    console.log(`   ❌ Static service loading failed: ${error.message}`);
  }

  // Test 2: Provider with dynamic GitHub service URL
  console.log('\n2. Testing provider with dynamic GitHub service URL...');
  
  try {
    // Get a dynamic provider from GitHub
    const githubProvider = await providerRegistry.getProvider('github:tsavo/prizm-chatterbox-service');
    
    // Verify it's a DockerMediaProvider
    if (!(githubProvider instanceof DockerMediaProvider)) {
      throw new Error('GitHub provider is not an instance of DockerMediaProvider');
    }

    // Verify its properties
    console.log(`   ✅ GitHub provider loaded: ${githubProvider.name} (${githubProvider.id})`);
    if (githubProvider.id !== 'prizm-chatterbox-service') {
      throw new Error('GitHub provider ID mismatch');
    }
    if (githubProvider.type !== 'local') {
      throw new Error('GitHub provider type mismatch');
    }
    if (!githubProvider.capabilities.includes('text-to-audio')) {
      throw new Error('GitHub provider capabilities mismatch');
    }

    // Access the underlying DockerComposeService
    const dockerServiceManager = githubProvider.getDockerServiceManager();
    if (!(dockerServiceManager instanceof DockerComposeService)) {
      throw new Error('DockerMediaProvider did not encapsulate a DockerComposeService');
    }
    console.log(`   ✅ DockerMediaProvider encapsulates a DockerComposeService`);
    
  } catch (error) {
    console.log(`   ❌ GitHub service loading failed: ${error.message}`);
  }

  // Test 3: Provider with NPM service package (conceptual - requires actual NPM package)
  console.log('\n3. Testing provider with NPM service package (conceptual)...');
  
  try {
    // This test is conceptual as it requires a real NPM package to exist
    // const npmProvider = await providerRegistry.getProvider('@company/gpu-accelerated-ffmpeg@2.1.0');
    // console.log(`   ✅ NPM provider loaded: ${npmProvider.name}`);
    console.log(`   ℹ️ This test is conceptual and requires a real NPM package to exist.`);
    
  } catch (error) {
    console.log(`   ❌ NPM service loading failed (expected): ${error.message}`);
  }

  console.log('\n🎯 PROVIDER → SERVICE ARCHITECTURE:');
  console.log('====================================');
  console.log('✅ Providers can specify service dependencies via URL (GitHub, local files)');
  console.log('✅ ServiceRegistry handles dynamic loading of Docker Compose services');
  console.log('✅ Providers can obtain and manage their DockerComposeService instances');
  console.log('✅ DockerMediaProvider encapsulates DockerComposeService for dynamic providers');
  
  console.log('\n📋 CONFIGURATION EXAMPLES:');
  console.log('===========================');
  console.log('// Static provider configuring with a GitHub service');
  console.log(`await provider.configure({`);
  console.log(`  serviceUrl: 'github:tsavo/prizm-ffmpeg-service',`);
  console.log(`  autoStartService: true`);
  console.log(`});`);
  console.log('');
  console.log('// Dynamically load a Docker-backed provider');
  console.log(`const chatterboxProvider = await providerRegistry.getProvider('github:tsavo/prizm-chatterbox-service');`);
  console.log(`await chatterboxProvider.startService(); // Start the underlying Docker service`);

  console.log('\n🚀 ARCHITECTURAL BENEFITS:');
  console.log('===========================');
  console.log('• 🔄 **Dynamic Dependencies**: Providers can specify their exact service needs');
  console.log('• 📦 **Decentralized Services**: Services can be distributed via GitHub/NPM');
  console.log('• 🔧 **Auto-Configuration**: Provider automatically configures from service info');
  console.log('• 🚀 **Zero-Setup**: Just specify a URL, everything else is automatic');
  console.log('• 🌐 **Version Control**: Use @version for reproducible deployments');
  console.log('• 🔒 **Isolation**: Each provider can use different service versions');

  console.log('\n💡 USE CASES:');
  console.log('==============');
  console.log('• AI Provider needs specific GPU-optimized inference service');
  console.log('• Video Provider needs latest FFMPEG with custom codec support');
  console.log('• Audio Provider needs specialized real-time processing service');
  console.log('• Different customers need different service configurations');
  console.log('• Development vs Production service environments');
}

if (require.main === module) {
  testProviderServiceDynamicLoading().catch(console.error);
}

export { testProviderServiceDynamicLoading };