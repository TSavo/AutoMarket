/**
 * OpenRouter Model List Fetcher
 * 
 * Get the actual available models from OpenRouter API to find free ones
 */

import fetch from 'node-fetch';

async function getOpenRouterModels() {
  console.log('🤖 Getting OpenRouter Model List');
  console.log('=================================');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    return;
  }

  try {
    // Get model list from OpenRouter API
    console.log('\n📋 Fetching available models from OpenRouter...');
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const modelsData = await response.json() as { data: any[] };
    
    console.log(`✅ Found ${modelsData.data.length} models`);
    
    // Find free models (pricing.prompt = "0" or "0.0")
    const freeModels = modelsData.data.filter(model => {
      const promptPrice = model.pricing?.prompt;
      return promptPrice === "0" || promptPrice === 0 || promptPrice === "0.0";
    });

    console.log('\n🆓 FREE MODELS FOUND:');
    if (freeModels.length > 0) {
      freeModels.forEach(model => {
        console.log(`  📌 ${model.id}`);
        console.log(`     Name: ${model.name}`);
        console.log(`     Context: ${model.context_length || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No completely free models found.');
    }

    // Find lowest cost models 
    console.log('\n💰 LOWEST COST MODELS (Top 10):');
    const sortedModels = modelsData.data
      .filter(model => model.pricing?.prompt && parseFloat(model.pricing.prompt) > 0)
      .sort((a, b) => parseFloat(a.pricing.prompt) - parseFloat(b.pricing.prompt))
      .slice(0, 10);

    sortedModels.forEach(model => {
      console.log(`  📌 ${model.id}`);
      console.log(`     Cost: $${model.pricing.prompt} per 1M tokens`);
      console.log(`     Context: ${model.context_length || 'Unknown'}`);
      console.log('');
    });

    // Look for DeepSeek models specifically
    console.log('\n🔍 DEEPSEEK MODELS:');
    const deepseekModels = modelsData.data.filter(model => 
      model.id.toLowerCase().includes('deepseek')
    );

    deepseekModels.forEach(model => {
      console.log(`  📌 ${model.id}`);
      console.log(`     Cost: $${model.pricing?.prompt || 'Unknown'} per 1M tokens`);
      console.log(`     Context: ${model.context_length || 'Unknown'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to fetch OpenRouter models:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  getOpenRouterModels().catch(console.error);
}

export { getOpenRouterModels };
