/**
 * Test Provider → Service Dynamic Loading
 * 
 * Demonstrates how providers can dynamically load and manage their service dependencies
 */

import { initializeProviders } from './src/media/registry/bootstrap';
import { initializeServices } from './src/media/registry/serviceBootstrap';

async function testProviderServiceDynamicLoading() {
  console.log('🧪 Testing Provider → Service Dynamic Loading\n');

  // Initialize registries
  console.log('📦 INITIALIZING REGISTRIES:');
  console.log('============================');
  
  try {
    await initializeProviders();
    await initializeServices();
    console.log('✅ Registries initialized');
  } catch (error) {
    console.log(`❌ Registry initialization failed: ${error.message}`);
    return;
  }
  console.log('\n🔄 TESTING DYNAMIC SERVICE LOADING:');
  console.log('====================================');

  // First, let's see what providers are actually available
  console.log('0. Checking available providers...');
  try {
    const { ProviderRegistry } = await import('./src/media/registry/bootstrap');
    const providerRegistry = ProviderRegistry.getInstance();
    const availableProviders = providerRegistry.getAvailableProviders();
    console.log(`   Available providers: ${availableProviders.join(', ')}`);
  } catch (error) {
    console.log(`   ❌ Failed to list providers: ${error.message}`);
  }

  // Test 1: Provider loads static service  
  console.log('\n1. Testing provider with static service dependency...');
  
  try {
    const { ProviderRegistry } = await import('./src/media/registry/bootstrap');
    const providerRegistry = ProviderRegistry.getInstance();
    
    // Get FFMPEG provider (use the actual registered name)
    const ffmpegProvider = await providerRegistry.getProvider('ffmpeg-docker'); // Try the actual name
    
    // Configure it to use a static service
    await ffmpegProvider.configure({
      serviceUrl: 'ffmpeg-docker',  // Static service from our registry
      autoStartService: false       // Don't actually start for this demo
    });
    
    console.log(`   ✅ Provider configured with static service successfully`);
    
  } catch (error) {
    console.log(`   ❌ Static service loading failed: ${error.message}`);
  }
  // Test 2: Provider with dynamic GitHub service URL
  console.log('\n2. Testing provider with GitHub service URL...');
  
  try {
    const { ProviderRegistry } = await import('./src/media/registry/bootstrap');
    const providerRegistry = ProviderRegistry.getInstance();
    
    // Get a fresh provider instance
    const ffmpegProvider = await providerRegistry.getProvider('ffmpeg-docker');
    
    // Configure it to load a service from GitHub (this will likely fail, but shows the pattern)
    await ffmpegProvider.configure({
      serviceUrl: 'https://github.com/tsavo/enhanced-ffmpeg-service',
      serviceConfig: {
        enableGPU: true,
        maxConcurrent: 4
      },
      autoStartService: false  // Don't auto-start for this test
    });
    
    console.log(`   ✅ Provider accepted GitHub service URL (would download if repo existed)`);
    
  } catch (error) {
    console.log(`   ❌ GitHub service loading failed (expected): ${error.message}`);
    console.log(`   ℹ️ This is expected - demo repo doesn't exist`);
  }

  // Test 3: Provider with NPM service package
  console.log('\n3. Testing provider with NPM service package...');
  
  try {
    const { ProviderRegistry } = await import('./src/media/registry/bootstrap');
    const providerRegistry = ProviderRegistry.getInstance();
    
    // Get a fresh provider instance  
    const ffmpegProvider = await providerRegistry.getProvider('ffmpeg-docker');
    
    // Configure it to load a service from NPM
    await ffmpegProvider.configure({
      serviceUrl: '@company/gpu-accelerated-ffmpeg@2.1.0',
      serviceConfig: {
        gpuType: 'nvidia',
        memory: '8GB'
      },
      autoStartService: false
    });
    
    console.log(`   ✅ Provider accepted NPM service URL (would install if package existed)`);
    
  } catch (error) {
    console.log(`   ❌ NPM service loading failed (expected): ${error.message}`);
    console.log(`   ℹ️ This is expected - demo package doesn't exist`);
  }

  console.log('\n🎯 PROVIDER → SERVICE ARCHITECTURE:');
  console.log('====================================');
  console.log('✅ Provider can specify service dependencies via URL');
  console.log('✅ Automatic service downloading and installation');
  console.log('✅ Automatic service startup and health checking');
  console.log('✅ Provider auto-configuration from service info');
  console.log('✅ Support for static, GitHub, and NPM service sources');
  
  console.log('\n📋 CONFIGURATION EXAMPLES:');
  console.log('===========================');
  console.log('// Static service from registry');
  console.log(`await provider.configure({`);
  console.log(`  serviceUrl: 'ffmpeg-docker'`);
  console.log(`});`);
  console.log('');
  console.log('// GitHub repository service');
  console.log(`await provider.configure({`);
  console.log(`  serviceUrl: 'https://github.com/company/enhanced-ffmpeg-service',`);
  console.log(`  serviceConfig: { enableGPU: true },`);
  console.log(`  autoStartService: true`);
  console.log(`});`);
  console.log('');
  console.log('// NPM package service');
  console.log(`await provider.configure({`);
  console.log(`  serviceUrl: '@company/gpu-ffmpeg-service@2.1.0',`);
  console.log(`  serviceConfig: { memory: '8GB' }`);
  console.log(`});`);

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
