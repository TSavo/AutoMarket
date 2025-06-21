/**
 * Debug Unclassified Models
 * 
 * Check what the unclassified models are and if any are video models
 */

import { TogetherAPIClient } from './src/media/providers/together/TogetherAPIClient';

async function debugUnclassifiedModels() {
  console.log('🔍 Debugging Unclassified Models...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    // 1. Get all models from API
    console.log('1️⃣ Fetching all models from Together AI...');
    const apiClient = new TogetherAPIClient({ apiKey });
    const allModels = await apiClient.getAvailableModels();
    
    console.log(`✅ Retrieved ${allModels.length} models\n`);

    // 2. Analyze each model to see what gets classified
    console.log('2️⃣ Analyzing model classification...');
    
    const classified = {
      text: [] as any[],
      image: [] as any[],
      unclassified: [] as any[]
    };

    allModels.forEach(model => {
      const modelId = model.id.toLowerCase();
      const displayName = (model.display_name || '').toLowerCase();
      const description = (model.description || '').toLowerCase();
      const modelType = (model.type || '').toLowerCase();
      
      // Image generation models
      const imageIndicators = [
        'flux', 'stable-diffusion', 'sd-', 'dall-e', 'midjourney', 'imagen',
        'kandinsky', 'playground', 'realvisxl', 'juggernaut', 'dreamshaper',
        'proteus', 'pixart', 'kolors', 'hunyuan', 'recraft'
      ];
      
      const isImageModel = 
        modelType === 'image' ||
        imageIndicators.some(indicator => 
          modelId.includes(indicator) || 
          displayName.includes(indicator) || 
          description.includes(indicator)
        ) ||
        description.includes('image generation') ||
        description.includes('text-to-image') ||
        displayName.includes('image');

      // Text generation models
      const textIndicators = [
        'llama', 'mistral', 'qwen', 'gemma', 'phi', 'deepseek', 'yi', 'nous',
        'openchat', 'wizardlm', 'vicuna', 'alpaca', 'claude', 'gpt', 'palm',
        'flan', 'ul2', 'opt', 'bloom', 'pythia', 'galactica', 'codegen',
        'starcoder', 'santacoder', 'replit', 'incite', 'redpajama', 'falcon',
        'mpt', 'dolly', 'stablelm', 'koala', 'baize', 'chatglm', 'moss',
        'instruct', 'chat', 'turbo', 'base'
      ];
      
      const isTextModel = 
        !isImageModel && (
          modelType === 'chat' ||
          modelType === 'language' ||
          modelType === 'text' ||
          textIndicators.some(indicator => 
            modelId.includes(indicator) || 
            displayName.includes(indicator)
          ) ||
          description.includes('language model') ||
          description.includes('text generation') ||
          description.includes('conversation') ||
          description.includes('instruct') ||
          description.includes('chat') ||
          (!modelType && !isImageModel)
        );

      if (isImageModel) {
        classified.image.push(model);
      } else if (isTextModel) {
        classified.text.push(model);
      } else {
        classified.unclassified.push(model);
      }
    });

    console.log(`📊 Classification results:`);
    console.log(`   Text models: ${classified.text.length}`);
    console.log(`   Image models: ${classified.image.length}`);
    console.log(`   Unclassified: ${classified.unclassified.length}\n`);

    // 3. Examine unclassified models in detail
    console.log('3️⃣ Examining unclassified models...');
    
    classified.unclassified.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
      console.log(`   Display Name: ${model.display_name || 'N/A'}`);
      console.log(`   Type: ${model.type || 'N/A'}`);
      console.log(`   Object: ${model.object || 'N/A'}`);
      console.log(`   Owner: ${model.owned_by || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      if (model.context_length) {
        console.log(`   Context Length: ${model.context_length}`);
      }
      if (model.pricing) {
        console.log(`   Pricing: Input $${model.pricing.input}, Output $${model.pricing.output}`);
      }
      console.log();
    });

    // 4. Look for video-related models specifically
    console.log('4️⃣ Searching for video-related models...');
    
    const videoKeywords = [
      'video', 'motion', 'animation', 'movie', 'film', 'clip', 'frame',
      'temporal', 'sequence', 'runway', 'pika', 'gen-2', 'gen2', 'sora',
      'lumalabs', 'luma', 'kling', 'cogvideo', 'animatediff', 'svd'
    ];

    const potentialVideoModels = allModels.filter(model => {
      const searchText = `${model.id} ${model.display_name || ''} ${model.description || ''}`.toLowerCase();
      return videoKeywords.some(keyword => searchText.includes(keyword));
    });

    if (potentialVideoModels.length > 0) {
      console.log(`✅ Found ${potentialVideoModels.length} potential video models:`);
      potentialVideoModels.forEach(model => {
        console.log(`   - ${model.id} (${model.display_name || 'N/A'})`);
        console.log(`     Type: ${model.type || 'N/A'}`);
        console.log(`     Description: ${model.description || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('❌ No video-related models found in current API response');
    }

    // 5. Look for other interesting model types
    console.log('5️⃣ Looking for other model types...');
    
    const modelTypes = new Map();
    allModels.forEach(model => {
      const type = model.type || 'unknown';
      modelTypes.set(type, (modelTypes.get(type) || 0) + 1);
    });

    console.log('📋 All model types found:');
    Array.from(modelTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count} models`);
      });

    // 6. Check for audio models
    console.log('\n6️⃣ Checking for audio models...');
    
    const audioModels = allModels.filter(model => {
      const searchText = `${model.id} ${model.display_name || ''} ${model.description || ''} ${model.type || ''}`.toLowerCase();
      return searchText.includes('audio') || 
             searchText.includes('speech') || 
             searchText.includes('voice') ||
             searchText.includes('sound') ||
             searchText.includes('music') ||
             searchText.includes('sonic') ||
             model.type === 'audio';
    });

    if (audioModels.length > 0) {
      console.log(`✅ Found ${audioModels.length} audio models:`);
      audioModels.forEach(model => {
        console.log(`   - ${model.id} (${model.display_name || 'N/A'})`);
        console.log(`     Type: ${model.type || 'N/A'}`);
        console.log();
      });
    }

    console.log('\n🎉 Unclassified model analysis completed!');

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug
if (require.main === module) {
  debugUnclassifiedModels().catch(console.error);
}

export { debugUnclassifiedModels };
