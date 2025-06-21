/**
 * Test Together AI Image Generation (Fixed)
 * 
 * Test image generation with correct FLUX model parameters.
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';
import { Text } from './src/media/assets/roles';

async function testTogetherImageFixed() {
  console.log('🎨 Testing Together AI Image Generation (Fixed)...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Together AI Provider...');
    const provider = new TogetherProvider();
    await provider.configure({ apiKey });
    console.log('✅ Provider configured\n');

    // 2. Check image models and their parameters
    console.log('2️⃣ Checking image models and parameters...');
    const imageModels = provider.getImageModels();
    console.log(`✅ Found ${imageModels.length} image models\n`);

    // Show FLUX model parameters
    const fluxModels = imageModels.filter(m => m.id.includes('FLUX'));
    fluxModels.slice(0, 3).forEach(model => {
      console.log(`📋 ${model.name}:`);
      console.log(`   ID: ${model.id}`);
      console.log(`   Steps: ${model.parameters.steps.min}-${model.parameters.steps.max} (default: ${model.parameters.steps.default})`);
      console.log(`   Size: ${model.parameters.width.min}-${model.parameters.width.max}x${model.parameters.height.min}-${model.parameters.height.max}`);
      console.log(`   Free: ${provider.isModelFree(model.id)}`);
      console.log();
    });

    // 3. Test with FLUX.1-schnell-Free (1-4 steps only)
    console.log('3️⃣ Testing FLUX.1-schnell-Free with correct parameters...');
    const modelId = 'black-forest-labs/FLUX.1-schnell-Free';
    
    if (provider.supportsTextToImageModel(modelId)) {
      try {
        const imageModel = await provider.createTextToImageModel(modelId);
        console.log(`✅ Image model created: ${imageModel.getName()}`);

        const prompt = new Text('A cute robot painting on a canvas, digital art style');
        console.log(`📝 Prompt: "${prompt.content}"`);
        
        // Use correct parameters for FLUX.1-schnell
        console.log('⏳ Generating image with correct parameters (4 steps max)...');
        
        const imageResult = await imageModel.transform(prompt, {
          width: 1024,
          height: 1024,
          steps: 4, // Max for schnell model
          seed: 42
        });

        console.log(`✅ Image generated successfully!`);
        console.log(`   Format: ${imageResult.format}`);
        console.log(`   Valid: ${imageResult.isValid()}`);
        console.log(`   Processing time: ${imageResult.metadata?.processingTime}ms`);
        
        if (imageResult.metadata?.url) {
          console.log(`   Image URL: ${imageResult.metadata.url}`);
        }
        
        if (imageResult.data && imageResult.data.length > 0) {
          console.log(`   Size: ${imageResult.getFileSize()} bytes`);
          const outputPath = `./test-flux-output-${Date.now()}.${imageResult.format}`;
          imageResult.saveToFile(outputPath);
          console.log(`   Saved to: ${outputPath}`);
        }

      } catch (error) {
        console.log(`❌ Image generation failed: ${error.message}`);
        
        // Try with even fewer steps
        if (error.message.includes('steps')) {
          console.log('🔄 Retrying with 1 step...');
          try {
            const imageModel = await provider.createTextToImageModel(modelId);
            const prompt = new Text('A simple sunset, minimal style');
            
            const imageResult = await imageModel.transform(prompt, {
              width: 512,
              height: 512,
              steps: 1 // Minimum steps
            });
            
            console.log(`✅ Image generated with 1 step!`);
            console.log(`   Processing time: ${imageResult.metadata?.processingTime}ms`);
            
          } catch (retryError) {
            console.log(`❌ Retry failed: ${retryError.message}`);
          }
        }
      }
    }

    // 4. Test with FLUX.1-dev (more steps allowed)
    console.log('\n4️⃣ Testing FLUX.1-dev with more steps...');
    const devModelId = 'black-forest-labs/FLUX.1-dev';
    
    if (provider.supportsTextToImageModel(devModelId)) {
      try {
        const imageModel = await provider.createTextToImageModel(devModelId);
        console.log(`✅ Dev model created: ${imageModel.getName()}`);



        const prompt = new Text('A futuristic city at night, cyberpunk style');
        console.log(`📝 Prompt: "${prompt.content}"`);
        
        console.log('⏳ Generating with dev model (20 steps)...');
        
        const imageResult = await imageModel.transform(prompt, {
          width: 1024,
          height: 1024,
          steps: 20, // More steps for dev model
          seed: 123
        });

        console.log(`✅ Dev model image generated!`);
        console.log(`   Processing time: ${imageResult.metadata?.processingTime}ms`);
        
        if (imageResult.metadata?.url) {
          console.log(`   Image URL: ${imageResult.metadata.url}`);
        }

      } catch (error) {
        console.log(`❌ Dev model failed: ${error.message}`);
      }
    }

    console.log('\n🎉 Image generation test completed!');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherImageFixed().catch(console.error);
}

export { testTogetherImageFixed };
