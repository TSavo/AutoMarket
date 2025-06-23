/**
 * Test script for HuggingFace Docker Provider
 * 
 * Tests the dynamic model loading capabilities of the new HuggingFace provider.
 */

import { initializeProviders, getProvider } from './src/media/registry/bootstrap';
import { MediaCapability } from './src/media/types/provider';
import { Text } from './src/media/assets/roles';
import { HuggingFaceDockerProvider } from './src/media/providers/docker/huggingface/HuggingFaceDockerProvider';

async function testHuggingFaceProvider() {
  console.log('🧪 Testing HuggingFace Docker Provider...\n');

  try {
    // Initialize providers
    console.log('📦 Initializing providers...');
    await initializeProviders();
    
    // Get HuggingFace provider
    console.log('🔍 Getting HuggingFace Docker provider...');
    const baseProvider = await getProvider('huggingface-docker');
    
    if (!baseProvider) {
      throw new Error('HuggingFace Docker provider not found');
    }
    
    // Cast to specific provider type to access extended methods
    const provider = baseProvider as unknown as HuggingFaceDockerProvider;
    
    console.log(`✅ Provider found: ${provider.name}`);
    console.log(`   Type: ${provider.type}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    
    // Get provider info
    const info = provider.getInfo();
    console.log('\n📋 Provider Info:');
    console.log(`   Description: ${info.description}`);
    console.log(`   Docker Image: ${info.dockerImage}`);
    console.log(`   Default Port: ${info.defaultPort}`);
    console.log(`   Features: ${info.features.join(', ')}`);
    
    // Check if service is available
    console.log('\n🔍 Checking service availability...');
    const isAvailable = await provider.isAvailable();
    console.log(`   Service Available: ${isAvailable}`);
    
    if (!isAvailable) {
      console.log('\n⚠️  Service not available. Starting Docker service...');
      
      try {
        console.log('🚀 Starting HuggingFace Docker service programmatically...');
        const startResult = await provider.startService();
        
        if (startResult) {
          console.log('✅ Service started successfully!');
          
          // Check availability again after starting
          const newAvailability = await provider.isAvailable();
          console.log(`   Service Available after start: ${newAvailability}`);
          
          if (!newAvailability) {
            console.log('⚠️  Service started but not yet healthy. This is normal for first startup.');
            console.log('   The service may need time to download models and become ready.');
            console.log('   You can check status with: docker-compose -f services/huggingface/docker-compose.yml ps');
            return;
          }
        } else {
          console.log('❌ Failed to start service programmatically.');
          console.log('   Manual steps:');
          console.log('   1. Navigate to services/huggingface/');
          console.log('   2. Run: docker-compose up -d');
          console.log('   3. Wait for service to be healthy');
          console.log('   4. Re-run this test');
          return;
        }
      } catch (error) {
        console.error('❌ Error starting service:', error instanceof Error ? error.message : 'Unknown error');
        console.log('   Falling back to manual instructions:');
        console.log('   1. Navigate to services/huggingface/');
        console.log('   2. Run: docker-compose up -d');
        console.log('   3. Wait for service to be healthy');
        console.log('   4. Re-run this test');
        return;
      }
    }
    
    // Get service health
    console.log('\n🏥 Getting service health...');
    const health = await provider.getServiceHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Loaded Models: ${health.loadedModels?.length || 0}`);
    
    // Test model creation (without actually generating)
    console.log('\n🎨 Testing model creation...');
    const testModelId = 'runwayml/stable-diffusion-v1-5';
    console.log(`   Creating model: ${testModelId}`);
    
    const model = await provider.getModel(testModelId);
    console.log(`✅ Model created successfully`);
    console.log(`   Model for: ${testModelId}`);
    
    // Test model availability check
    console.log('\n🔍 Testing model availability...');
    const modelAvailable = await model.isAvailable();
    console.log(`   Model Available: ${modelAvailable}`);
    
    if (modelAvailable) {
      console.log('\n🖼️  Testing image generation...');
      
      // Create text input
      const textInput = new Text('A beautiful sunset over mountains', 'en', 1.0);
      
      // Test with small, fast parameters
      const options = {
        width: 256,
        height: 256,
        numInferenceSteps: 10, // Fast generation
        guidanceScale: 7.5
      };
      
      console.log(`   Prompt: "${textInput.content}"`);
      console.log(`   Parameters: ${JSON.stringify(options)}`);
      
      try {
        const startTime = Date.now();
        const image = await model.transform(textInput, options);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Image generated successfully!`);
        console.log(`   Generation time: ${duration}ms`);
        console.log(`   Image format: ${image.format}`);
        console.log(`   Image size: ${image.getSize()} bytes (${image.getHumanSize()})`);
        
        // Get file path from metadata if available
        const filePath = image.metadata.filePath || image.metadata.sourceUrl;
        if (filePath) {
          console.log(`   Image location: ${filePath}`);
        }
        
        // Check if metadata was added
        if ((image as any).metadata) {
          const metadata = (image as any).metadata;
          console.log(`   Model used: ${metadata.modelId}`);
          console.log(`   Seed: ${metadata.seed || 'random'}`);
        }
        
      } catch (error) {
        console.error(`❌ Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Test model management
    console.log('\n🔧 Testing model management...');
    
    try {
      const loadedModels = await provider.listLoadedModels();
      console.log(`   Currently loaded models: ${loadedModels.length}`);
      
      for (const modelInfo of loadedModels) {
        console.log(`     - ${modelInfo.modelId} (${modelInfo.memoryUsage}MB)`);
      }
      
    } catch (error) {
      console.log(`   Could not list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Test supported models
    console.log('\n📋 Testing supported models...');
    const supportedModels = provider.getSupportedTextToImageModels();
    console.log(`   Example supported models: ${supportedModels.slice(0, 3).join(', ')}...`);
    console.log(`   Total examples: ${supportedModels.length}`);
    
    // Test model capability check
    console.log('\n✅ Testing model support checks...');
    const testModels = [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-xl-base-1.0',
      'black-forest-labs/FLUX.1-dev',
      'invalid-model-id',
      ''
    ];
    
    for (const modelId of testModels) {
      const supported = provider.supportsTextToImageModel(modelId);
      console.log(`   ${modelId || '(empty)'}: ${supported ? '✅' : '❌'}`);
    }
    
    console.log('\n🎉 HuggingFace Docker Provider test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
if (require.main === module) {
  testHuggingFaceProvider().catch(console.error);
}

export { testHuggingFaceProvider };
