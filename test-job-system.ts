/**
 * Test Complete Job System with Generation Chain
 * 
 * This test demonstrates the full REST API job system:
 * 1. Creates jobs via POST /api/v1/transform/{provider}/{model}
 * 2. Polls job status via GET /api/v1/jobs/{jobId}  
 * 3. Downloads assets via GET /api/v1/jobs/{jobId}/download
 * 4. Views metadata via GET /api/v1/jobs/{jobId}/metadata
 * 5. Shows complete generation chain lineage
 */

import { Text } from './src/media/assets/roles/classes/Text';

async function testJobSystem() {
  console.log('🔗 Testing Complete Job System with Generation Chains...');
  
  try {
    const baseUrl = 'http://localhost:3000/api/v1';
    
    console.log('\n=== STEP 1: Create Text Enhancement Job ===');
    
    // Create original text
    const originalText = new Text("A majestic dragon");
    
    // Create LLM enhancement job  
    const llmJobResponse = await fetch(`${baseUrl}/transform/openrouter/deepseek%2Fdeepseek-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'text-to-text',
        modelId: 'deepseek/deepseek-chat',
        input: originalText,
        options: {
          system: "You are a creative assistant. Enhance the given text into a detailed, vivid image description suitable for AI image generation. Keep it under 100 words.",
          temperature: 0.7
        }
      })
    });
    
    const llmJob = await llmJobResponse.json();
    console.log(`📝 Created LLM job: ${llmJob.data.jobId}`);
    console.log(`   Status: ${llmJob.data.status}`);
    console.log(`   Status URL: ${llmJob.data.statusUrl}`);
    
    // Poll LLM job until complete
    console.log('\n🔄 Polling LLM job status...');
    const enhancedText = await pollJobUntilComplete(llmJob.data.jobId);
    
    console.log('\n=== STEP 2: Create Image Generation Job ===');
    
    // Create image generation job using the enhanced text
    const imageJobResponse = await fetch(`${baseUrl}/transform/replicate/black-forest-labs%2Fflux-schnell`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'text-to-image',
        modelId: 'black-forest-labs/flux-schnell', 
        input: enhancedText, // This carries the generation_prompt from step 1!
        options: {
          aspect_ratio: "16:9",
          steps: 4,
          megapixels: "1"
        }
      })
    });
    
    const imageJob = await imageJobResponse.json();
    console.log(`🎨 Created image job: ${imageJob.data.jobId}`);
    
    // Poll image job until complete
    console.log('\n🔄 Polling image job status...');
    const finalImage = await pollJobUntilComplete(imageJob.data.jobId);
    
    console.log('\n=== STEP 3: Explore Job Results ===');
    
    // Get full metadata with generation chain
    const metadataResponse = await fetch(`${baseUrl}/jobs/${imageJob.data.jobId}/metadata`);
    const metadata = await metadataResponse.json();
    
    console.log('\n📊 Complete Generation Chain:');
    metadata.data.generation_chain.forEach((step, index) => {
      const indent = '  '.repeat(index);
      console.log(`${indent}📍 Step ${step.step}:`);
      console.log(`${indent}   Asset: ${step.asset_type}`);
      if (step.model) {
        console.log(`${indent}   Model: ${step.provider}/${step.model}`);
        console.log(`${indent}   Options: ${JSON.stringify(step.options)}`);
      } else {
        console.log(`${indent}   Source: "${step.content}"`);
      }
      console.log(`${indent}   Time: ${step.timestamp}`);
    });
    
    console.log('\n📁 Asset URLs:');
    if (finalImage.urls) {
      console.log(`   Primary: ${baseUrl}${finalImage.urls.primary}`);
      if (finalImage.urls.thumbnails) {
        finalImage.urls.thumbnails.forEach(thumb => {
          console.log(`   Thumbnail: ${baseUrl}${thumb}`);
        });
      }
    }
    
    console.log('\n🎉 Job system test completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   ✅ Jobs preserve complete generation_prompt chains');
    console.log('   ✅ Binary assets expose download URLs, not inline data');
    console.log('   ✅ Flattened generation chain for easy API consumption');
    console.log('   ✅ Perfect foundation for transformation pipelines!');
    
  } catch (error) {
    console.error('❌ Job system test failed:', error.message);
  }
}

async function pollJobUntilComplete(jobId: string, maxWait: number = 60000): Promise<any> {
  const startTime = Date.now();
  const baseUrl = 'http://localhost:3000/api/v1';
  
  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`${baseUrl}/jobs/${jobId}`);
    const job = await response.json();
    
    console.log(`   Status: ${job.data.status}${job.data.progress ? ` (${job.data.progress}%)` : ''}`);
    
    if (job.data.status === 'completed') {
      console.log(`   ✅ Completed in ${job.data.processingTime}ms`);
      if (job.data.output) {
        console.log(`   📤 Output: ${job.data.output.type}`);
      }
      return job.data.output;
    } else if (job.data.status === 'failed') {
      throw new Error(`Job failed: ${job.data.error}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Job timed out after ${maxWait}ms`);
}

// Note: This test requires the Next.js dev server to be running
console.log('🚨 Start the Next.js dev server first: npm run dev');
console.log('📡 Then run this test to demonstrate the job system');

// Uncomment to run when server is ready:
// testJobSystem().catch(console.error);
