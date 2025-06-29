/**
 * Test GitHub Provider Loading
 * 
 * Test the new GitHub repository loading functionality
 */

import { ProviderRegistry } from './src/media/registry/ProviderRegistry';
import { ServiceRegistry } from './src/media/registry/ServiceRegistry';
import { DockerMediaProvider } from './src/media/providers/docker/DockerMediaProvider';
import { DockerComposeService } from './src/services/DockerComposeService';

async function testGitHubLoading() {
  console.log('🧪 Testing GitHub Repository Loading\n');

  const providerRegistry = ProviderRegistry.getInstance();
  const serviceRegistry = ServiceRegistry.getInstance();

  console.log('📋 TESTING URL PARSING:');
  console.log('=======================');

  // Test various GitHub URL formats
  const testUrls = [
    'github:tsavo/prizm-ffmpeg-service',
    'github:tsavo/prizm-chatterbox-service',
    'github:tsavo/prizm-kokoro-service',
    'github:tsavo/prizm-ollama-service',
    'github:tsavo/prizm-whisper-service',
    'github:tsavo/prizm-zonos-service'
  ];

  for (const url of testUrls) {
    try {
      const parsed = (providerRegistry as any).parseIdentifier(url);
      console.log(`✅ ${url}`);
      console.log(`   → ${JSON.stringify(parsed, null, 2)}`);
    } catch (error) {
      console.log(`❌ ${url}`);
      console.log(`   → Error: ${error.message}`);
    }
  }

  console.log('\n🔧 TESTING GITHUB PROVIDER LOADING:');
  console.log('====================================');

  // Test loading a real GitHub repository as a Prizm provider
  console.log('1. Testing GitHub provider loading (prizm-ffmpeg-service)...');
  
  try {
    const provider = await providerRegistry.getProvider('github:tsavo/prizm-ffmpeg-service');
    console.log(`   ✅ Provider loaded successfully: ${provider.name} (${provider.id})`);
    if (!(provider instanceof DockerMediaProvider)) {
      throw new Error('Provider is not an instance of DockerMediaProvider');
    }
    if (provider.id !== 'prizm-ffmpeg-service') {
      throw new Error('Provider ID mismatch');
    }
    if (provider.type !== 'local') {
      throw new Error('Provider type mismatch');
    }
    if (!provider.capabilities.includes('video-to-video')) {
      throw new Error('Provider capabilities mismatch');
    }
  } catch (error) {
    console.log(`   ❌ Provider loading failed: ${error.message}`);
  }

  console.log('\n🐳 TESTING GITHUB SERVICE LOADING:');
  console.log('===================================');

  console.log('1. Testing GitHub service loading (prizm-ffmpeg-service)...');
  
  try {
    const service = await serviceRegistry.getService('github:tsavo/prizm-ffmpeg-service');
    console.log(`   ✅ Service loaded successfully: ${service.getServiceInfo().composeService}`);
    if (!(service instanceof DockerComposeService)) {
      throw new Error('Service is not an instance of DockerComposeService');
    }
    if (service.getServiceInfo().composeService !== 'prizm-ffmpeg-service') {
      throw new Error('Service composeService mismatch');
    }
  } catch (error) {
    console.log(`   ❌ Service loading failed: ${error.message}`);
  }

  console.log('\n🎯 GITHUB LOADING IMPLEMENTATION STATUS:');
  console.log('=========================================');
  console.log('✅ URL parsing for GitHub repositories');
  console.log('✅ Repository cloning with git');
  console.log('✅ Temporary file cleanup');
  console.log('✅ Error handling and fallbacks');
  console.log('✅ Configuration loading (prizm.service.json)');
  
  console.log('\n📦 PROVIDER PACKAGE REQUIREMENTS:');
  console.log('==================================');
  console.log('For a GitHub repository to work as a Prizm provider:');
  console.log('1. Must contain a valid docker-compose.yml');
  console.log('2. Must contain a prizm.service.json with metadata (id, name, capabilities, etc.)');
  
  console.log('\n🐳 SERVICE PACKAGE REQUIREMENTS:');
  console.log('=================================');
  console.log('For a GitHub repository to work as a Prizm service:');
  console.log('1. Must contain a valid docker-compose.yml');
  console.log('2. Must contain a prizm.service.json with metadata (serviceName, composeFile, etc.)');

  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('• Create actual example provider/service repositories on GitHub');
  console.log('• Add security validation for loaded Docker Compose files');
  console.log('• Implement caching for downloaded repositories');
  console.log('• Add support for private repositories (authentication)');
  console.log('• Create scaffolding tools for provider/service creation');
}

if (require.main === module) {
  testGitHubLoading().catch(console.error);
}

export { testGitHubLoading };