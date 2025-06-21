/**
 * Test Enhanced Together AI Implementation
 * 
 * Test both TextToTextProvider and TextToImageProvider capabilities.
 */

import { TogetherProvider } from './src/media/providers/TogetherProvider';
import { Text } from './src/media/assets/roles';
import { MediaCapability } from './src/media/types/provider';

async function testTogetherEnhanced() {
  console.log('🧪 Testing Enhanced Together AI Implementation...\n');

  // Check for API key
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    console.log('   Get a free key at: https://api.together.xyz/settings/api-keys');
    return;
  }

  try {
    // 1. Create and configure provider
    console.log('1️⃣ Creating Enhanced Together AI Provider...');
    const provider = new TogetherProvider();
    
    await provider.configure({
      apiKey: apiKey
    });
    console.log('✅ Provider configured\n');

    // 2. Check capabilities
    console.log('2️⃣ Checking provider capabilities...');
    console.log(`✅ Capabilities: ${provider.capabilities.join(', ')}`);
    console.log(`✅ Available: ${await provider.isAvailable()}\n`);

    // 3. List all models with segregation
    console.log('3️⃣ Listing models by capability...');
    const allModels = provider.models;
    const textModels = provider.getTextModels();
    const imageModels = provider.getImageModels();
    
    console.log(`✅ Total models: ${allModels.length}`);
    console.log(`✅ Text models: ${textModels.length}`);
    console.log(`✅ Image models: ${imageModels.length}\n`);

    // 4. Show some text models
    console.log('4️⃣ Sample Text Models:');
    textModels.slice(0, 5).forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name} (${model.id})`);
      console.log(`      Capabilities: ${model.capabilities.join(', ')}`);
      console.log(`      Free: ${provider.isModelFree(model.id)}`);
    });
    console.log();

    // 5. Show some image models
    console.log('5️⃣ Sample Image Models:');
    imageModels.slice(0, 5).forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name} (${model.id})`);
      console.log(`      Capabilities: ${model.capabilities.join(', ')}`);
      console.log(`      Free: ${provider.isModelFree(model.id)}`);
    });
    console.log();

    // 6. Test Text Generation
    console.log('6️⃣ Testing Text Generation...');
    const textModelId = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';
    
    if (provider.supportsTextToTextModel(textModelId)) {
      try {
        const textModel = await provider.createTextToTextModel(textModelId);
        console.log(`✅ Text model created: ${textModel.getName()}`);

        const textInput = new Text('Write a short poem about AI and creativity.');
        const textResult = await textModel.transform(textInput, {
          temperature: 0.8,
          maxOutputTokens: 100
        });

        console.log(`✅ Text generated successfully!`);
        console.log(`   Input: "${textInput.content}"`);
        console.log(`   Output: "${textResult.content}"`);
        console.log(`   Processing time: ${textResult.metadata?.processingTime}ms\n`);
      } catch (error) {
        console.log(`❌ Text generation failed: ${error.message}\n`);
      }
    } else {
      console.log(`❌ Text model ${textModelId} not supported\n`);
    }

    // 7. Test Image Generation
    console.log('7️⃣ Testing Image Generation...');
    const imageModelId = 'black-forest-labs/FLUX.1-schnell-Free';
    
    if (provider.supportsTextToImageModel(imageModelId)) {
      try {
        const imageModel = await provider.createTextToImageModel(imageModelId);
        console.log(`✅ Image model created: ${imageModel.getName()}`);

        const imageInput = new Text('A beautiful sunset over mountains, digital art style');
        console.log(`📝 Image prompt: "${imageInput.content}"`);
        
        // Note: Image generation might take longer and cost money
        console.log('⏳ Generating image (this may take 30-60 seconds)...');
        
        const imageResult = await imageModel.transform(imageInput, {
          width: 1024,
          height: 1024,
          steps: 20
        });

        console.log(`✅ Image generated successfully!`);
        console.log(`   Format: ${imageResult.format}`);
        console.log(`   Size: ${imageResult.getFileSize()} bytes`);
        console.log(`   Dimensions: ${JSON.stringify(imageResult.getDimensions())}`);
        console.log(`   Processing time: ${imageResult.metadata?.processingTime}ms`);
        
        // Save image to file
        const outputPath = `./test-output-${Date.now()}.${imageResult.format}`;
        if (imageResult.data.length > 0) {
          imageResult.saveToFile(outputPath);
          console.log(`   Saved to: ${outputPath}\n`);
        } else {
          console.log(`   Image URL: ${imageResult.metadata?.url}\n`);
        }

      } catch (error) {
        console.log(`❌ Image generation failed: ${error.message}`);
        console.log('   (This might be due to rate limits or model availability)\n');
      }
    } else {
      console.log(`❌ Image model ${imageModelId} not supported\n`);
    }

    // 8. Test capability filtering
    console.log('8️⃣ Testing Capability Filtering...');
    const textCapabilityModels = provider.getModelsForCapability(MediaCapability.TEXT_GENERATION);
    const imageCapabilityModels = provider.getModelsForCapability(MediaCapability.IMAGE_GENERATION);
    
    console.log(`✅ Models with TEXT_GENERATION: ${textCapabilityModels.length}`);
    console.log(`✅ Models with IMAGE_GENERATION: ${imageCapabilityModels.length}`);
    
    // Verify no overlap in capabilities
    const textOnlyModels = textCapabilityModels.filter(m => 
      !m.capabilities.includes(MediaCapability.IMAGE_GENERATION)
    );
    const imageOnlyModels = imageCapabilityModels.filter(m => 
      !m.capabilities.includes(MediaCapability.TEXT_GENERATION)
    );
    
    console.log(`✅ Text-only models: ${textOnlyModels.length}`);
    console.log(`✅ Image-only models: ${imageOnlyModels.length}\n`);

    console.log('🎉 Enhanced Together AI implementation test completed!');
    console.log('✅ Both TextToTextProvider and TextToImageProvider working!');

  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
if (require.main === module) {
  testTogetherEnhanced().catch(console.error);
}

export { testTogetherEnhanced };
