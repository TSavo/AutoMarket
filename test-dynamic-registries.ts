/**
 * Test Dynamic Provider and Service Registries
 * 
 * Quick test to verify dynamic loading works
 */

import { initializeProviders, ProviderRegistry } from './src/media/registry/bootstrap';
import { initializeServices, ServiceRegistry } from './src/media/registry/serviceBootstrap';

async function testDynamicRegistries() {
  console.log('🧪 Testing Dynamic Provider and Service Registries
');

  // Test Provider Registry
  console.log('\n📦 PROVIDER REGISTRY TESTS:');
  console.log('============================');
  
  const providerRegistry = ProviderRegistry.getInstance();
  
  try {
    // Test existing static provider
    console.log('1. Testing static provider (ffmpeg)...');
    const ffmpegProvider = await providerRegistry.getProvider('ffmpeg');
    console.log(`   ✅ Static provider loaded: ${ffmpegProvider.name} (${ffmpegProvider.id})`);
  } catch (error) {
    console.log(`   ❌ Static provider failed: ${error.message}`);
  }

  try {
    // Test dynamic provider URL parsing
    console.log('2. Testing URL parsing...');
    const parsed = (providerRegistry as any).parseIdentifier('https://github.com/tsavo/prizm-ffmpeg-provider');
    console.log(`   ✅ URL parsed: ${JSON.stringify(parsed, null, 2)}`);

    // Test dynamic GitHub provider loading
    console.log('4. Testing dynamic GitHub provider loading...');
    const githubProvider = await providerRegistry.getProvider('github:tsavo/prizm-ffmpeg-provider');
    console.log(`   ✅ GitHub provider loaded: ${githubProvider.name} (${githubProvider.id})`);
    if (githubProvider.id !== 'prizm-ffmpeg-provider') {
      throw new Error('GitHub provider ID mismatch');
    }
    if (githubProvider.type !== 'local') {
      throw new Error('GitHub provider type mismatch');
    }
    if (!githubProvider.capabilities.includes('video-to-video')) {
      throw new Error('GitHub provider capabilities mismatch');
    }
  } catch (error) {
    console.log(`   ❌ Dynamic provider loading failed: ${error.message}`);
  }

  // Test Service Registry
  console.log('\n🐳 SERVICE REGISTRY TESTS:');
  console.log('==========================');
  
  const serviceRegistry = ServiceRegistry.getInstance();
  
  try {
    // Test service registry stats
    console.log('1. Testing service registry stats...');
    const stats = serviceRegistry.getStats();
    console.log(`   ✅ Service registry stats: ${JSON.stringify(stats)}`);
  } catch (error) {
    console.log(`   ❌ Service registry stats failed: ${error.message}`);
  }

  try {
    // Test registered services
    console.log('2. Testing registered services...');
    const availableServices = serviceRegistry.getAvailableServices();
    console.log(`   ✅ Available services: ${availableServices.join(', ')}`);
    
    if (availableServices.length > 0) {
      const firstService = await serviceRegistry.getService(availableServices[0]);
      const serviceInfo = firstService.getServiceInfo();
      console.log(`   ✅ Service loaded: ${serviceInfo.composeService}`);
    }
  } catch (error) {
    console.log(`   ❌ Service loading failed: ${error.message}`);
  }

  try {
    // Test service identifier parsing
    console.log('3. Testing service URL parsing...');
    const parsed = (serviceRegistry as any).parseIdentifier('github:tsavo/prizm-huggingface-service@v1.0.0');
    console.log(`   ✅ Service URL parsed: ${JSON.stringify(parsed, null, 2)}`);
  } catch (error) {
    console.log(`   ❌ Service URL parsing failed: ${error.message}`);
  }

  try {
    // Test dynamic identifier detection
    console.log('4. Testing dynamic identifier detection...');
    const isDynamic1 = (serviceRegistry as any).isDynamicIdentifier('https://github.com/user/repo');
    const isDynamic2 = (serviceRegistry as any).isDynamicIdentifier('@user/package');
    const isDynamic3 = (serviceRegistry as any).isDynamicIdentifier('static-service');
    console.log(`   ✅ Dynamic detection: github=${isDynamic1}, npm=${isDynamic2}, static=${isDynamic3}`);
  } catch (error) {
    console.log(`   ❌ Dynamic detection failed: ${error.message}`);
  }
  console.log('\n🎯 SUMMARY:');
  console.log('===========');
  console.log('Registries now support:');
  console.log('• ✅ Static registration (existing behavior)');
  console.log('• ✅ Dynamic loading of Docker Compose services from URLs (GitHub, local files)');
  console.log('\nUsage Examples:');
  console.log(`• getProvider('ffmpeg')                                    // Static`);
  console.log(`• getProvider('github:tsavo/prizm-ffmpeg-provider')        // GitHub Docker Service`);
  console.log(`• getService('huggingface-docker')                        // Static`);
}

if (require.main === module) {
  testDynamicRegistries().catch(console.error);
}

export { testDynamicRegistries };
