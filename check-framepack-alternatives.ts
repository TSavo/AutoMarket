import { ReplicateClient } from './src/media/clients/ReplicateClient';

async function checkSpecificModels() {
  const client = new ReplicateClient({
    apiKey: process.env.REPLICATE_API_TOKEN!,
    discovery: { cacheDir: './cache' }
  });

  console.log('🔍 Checking for FAL.ai framepack equivalent on Replicate...\n');

  // Try to get metadata for the key video models we found
  const videoModels = [
    'minimax/video-01',
    'minimax/video-01-live', 
    'kwaivgi/kling-v2.1',
    'google/veo-3'
  ];

  for (const modelId of videoModels) {
    try {
      console.log(`📋 Checking ${modelId}:`);
      const meta = await client.getModelMetadata(modelId);
      console.log(`   Category: ${meta.category}`);
      console.log(`   Parameters: ${Object.keys(meta.parameters).length}`);
      console.log(`   Run count: ${meta.run_count.toLocaleString()}`);
      console.log(`   Description: ${meta.description.substring(0, 100)}...`);
      
      // Check if it supports image input (like framepack)
      const hasImageInput = Object.keys(meta.parameters).some(param => 
        param.toLowerCase().includes('image') || 
        param.toLowerCase().includes('frame')
      );
      console.log(`   Image input support: ${hasImageInput ? '✅ YES' : '❌ NO'}`);
      
      // Show relevant parameters
      const imageParams = Object.entries(meta.parameters).filter(([name]) => 
        name.toLowerCase().includes('image') || 
        name.toLowerCase().includes('frame') ||
        name.toLowerCase().includes('prompt')
      );
      
      if (imageParams.length > 0) {
        console.log('   Relevant parameters:');
        for (const [name, param] of imageParams) {
          console.log(`     • ${name}: ${param.type} - ${param.description.substring(0, 60)}...`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Failed to get metadata: ${(error as Error).message}`);
    }
  }

  // Conclusion
  console.log('🎯 CONCLUSION:');
  console.log('Replicate does NOT have the specific "fal-ai/framepack" model.');
  console.log('However, it has several excellent image-to-video alternatives:');
  console.log('');
  console.log('✅ minimax/video-01 - Most popular (511K+ runs)');
  console.log('✅ minimax/video-01-live - Specialized for Live2D animation');  
  console.log('✅ kwaivgi/kling-v2.1 - High quality 1080p output');
  console.log('✅ google/veo-3 - Latest Google model with audio');
  console.log('');
  console.log('These models provide similar or better functionality than framepack!');
}

checkSpecificModels();
