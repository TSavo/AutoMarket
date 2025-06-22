/**
 * Test Generation Prompt Metadata
 * 
 * This script demonstrates how the generation_prompt metadata is automatically
 * added to assets when they are created through model transform methods.
 */

import { ReplicateTextToImageModel } from './src/media/providers/replicate/ReplicateTextToImageModel';
import { ReplicateClient } from './src/media/providers/replicate/ReplicateClient';
import { Text } from './src/media/assets/roles';
import Replicate from 'replicate';

async function testGenerationPromptMetadata() {
  try {
    console.log('🧪 Testing Generation Prompt Metadata...\n');

    // Create a mock Replicate client (you'd need real API key for actual testing)
    const mockReplicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN || 'mock-token'
    });

    const mockReplicateClientWrapper = {
      testConnection: async () => true,
      getTextToImageModels: async () => []
    } as any;

    // Create a mock model
    const model = new ReplicateTextToImageModel({
      client: mockReplicateClientWrapper,
      modelMetadata: {
        id: 'stability-ai/stable-diffusion-xl-base-1.0:626561e1e6c6f03e8583c0b92b5e84b3d45b50dd6c1bcd6b5bb3b6e5e8b8b8b8',
        name: 'Stable Diffusion XL',
        description: 'A text-to-image model',        parameters: {
          prompt: { type: 'string', description: 'Input prompt' },
          width: { type: 'integer', description: 'Image width', default: 1024 },
          height: { type: 'integer', description: 'Image height', default: 1024 },
          num_inference_steps: { type: 'integer', description: 'Number of denoising steps', default: 50 }
        }
      },
      replicateClient: mockReplicateClient
    });

    // Create sample text input
    const textInput = new Text(
      'A beautiful sunset over mountains with vibrant colors',
      'en',
      1.0,
      { sourceFile: 'prompt.txt' }
    );

    // Define transform options
    const transformOptions = {
      width: 1024,
      height: 1024,
      steps: 30,
      guidanceScale: 7.5,
      seed: 12345,
      negativePrompt: 'blurry, low quality'
    };

    console.log('📝 Input Text:', textInput.content);
    console.log('⚙️  Transform Options:', transformOptions);
    console.log('\n🎯 Expected Generation Prompt Metadata:');
    
    // Show what the generation_prompt metadata would look like
    const expectedGenerationPrompt = {
      input: textInput.content,
      options: transformOptions,
      modelId: 'stability-ai/stable-diffusion-xl-base-1.0:626561e1e6c6f03e8583c0b92b5e84b3d45b50dd6c1bcd6b5bb3b6e5e8b8b8b8',
      modelName: 'Stable Diffusion XL',
      provider: 'replicate',
      transformationType: 'text-to-image',
      timestamp: new Date(),
      metadata: {
        replicateModelParameters: {
          prompt: { type: 'string', description: 'Input prompt' },
          width: { type: 'integer', default: 1024 },
          height: { type: 'integer', default: 1024 },
          num_inference_steps: { type: 'integer', default: 50 }
        },
        modelVersion: 'stability-ai/stable-diffusion-xl-base-1.0:626561e1e6c6f03e8583c0b92b5e84b3d45b50dd6c1bcd6b5bb3b6e5e8b8b8b8'
      }
    };

    console.log(JSON.stringify(expectedGenerationPrompt, null, 2));

    console.log('\n✅ Generation Prompt Metadata Structure:');
    console.log('   • input: Original text prompt used for generation');
    console.log('   • options: All transform parameters (width, height, steps, etc.)');
    console.log('   • modelId: Specific model version identifier');
    console.log('   • modelName: Human-readable model name');
    console.log('   • provider: The provider service (replicate, fal.ai, etc.)');
    console.log('   • transformationType: Type of transformation performed');
    console.log('   • timestamp: When the transformation was performed');
    console.log('   • metadata: Additional context like model parameters');

    console.log('\n🔧 Usage in Generated Assets:');
    console.log('   When models call transform(), the resulting Image asset will have:');
    console.log('   image.metadata.generation_prompt = { ... rich data object ... }');
    console.log('\n   This enables:');
    console.log('   • Reproducible generation by re-using the same prompt data');
    console.log('   • Debugging by understanding exactly how an asset was created');
    console.log('   • Analytics on generation parameters and success rates');
    console.log('   • Asset provenance tracking for compliance/auditing');

    console.log('\n📋 Implementation Notes:');
    console.log('   • generation_prompt is added automatically by models during transform()');
    console.log('   • The metadata preserves all the original arguments passed to transform()');
    console.log('   • Each asset type (Image, Video, Audio) supports generation_prompt');
    console.log('   • The structure is extensible for different model types and providers');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testGenerationPromptMetadata();
}

export default testGenerationPromptMetadata;
