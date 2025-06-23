/**
 * Debug Generation Chain Issue with Structured JSON Support
 */

async function debugGenerationChain() {
  console.log('🔍 Debug Generation Chain with Structured JSON...');
  
  try {    // Create a transformation with structured JSON
    const transformResponse = await fetch(
      'http://localhost:3002/api/v1/transform/openrouter/deepseek%2Fdeepseek-r1-distill-llama-70b',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'text-to-text',
          input: {
            content: 'Model: fal-ai/flux-pro\nDescription: FLUX.1 [pro] generates high-quality images from text prompts using a 12B parameter transformer.',
            metadata: {}
          },
          options: {
            systemPrompt: 'You categorize AI models. Respond with valid JSON only. Use this exact format: {"category": "TEXT_TO_IMAGE", "confidence": 0.95}',
            responseFormat: 'json',
            temperature: 0.1,
            maxTokens: 50
          }
        })
      }
    );
      const transformData = await transformResponse.json();
    console.log('Transform response:', transformData);
    
    if (!transformData.success || !transformData.data?.jobId) {
      console.error('❌ Transform failed:', transformData);
      return;
    }
    
    const jobId = transformData.data.jobId;
    console.log(`✅ Job created: ${jobId}`);
      // Wait patiently for completion with proper polling
    console.log('⏳ Waiting for completion (being patient this time)...');
    
    let attempts = 0;
    let maxAttempts = 30; // Wait up to 30 seconds
    let completed = false;
    
    while (attempts < maxAttempts && !completed) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      console.log(`   Attempt ${attempts}: Checking job status...`);
      
      const jobResponse = await fetch(`http://localhost:3002/api/v1/jobs/${jobId}`);
      const jobData = await jobResponse.json();
      
      if (jobData.success) {
        const status = jobData.data?.status;
        console.log(`   Status: ${status}`);
        
        if (status === 'completed') {
          completed = true;
          console.log('\n✅ Job completed successfully!');
            console.log('=== Job Status Endpoint ===');
          console.log('Generation chain length (job status):', jobData.data?.generation_chain?.length);
          console.log('Full output content:');
          console.log('---');
          console.log(jobData.data?.output?.content);
          console.log('---');
          console.log('Generation chain (job status):', JSON.stringify(jobData.data?.generation_chain, null, 2));
          
          // Try to parse the JSON output to verify structured response
          console.log('\n=== JSON Parsing Test ===');
          try {
            const parsedOutput = JSON.parse(jobData.data?.output?.content);
            console.log('✅ Successfully parsed JSON output:', parsedOutput);
            console.log('📋 Category detected:', parsedOutput.category);
            console.log('📊 Confidence:', parsedOutput.confidence);
          } catch (parseError) {
            console.log('❌ Failed to parse as JSON (might be plain text):', jobData.data?.output?.content);
          }
          
          // Test metadata endpoint
          console.log('\n=== Metadata Endpoint ===');
          const metadataResponse = await fetch(`http://localhost:3002/api/v1/jobs/${jobId}/metadata`);
          const metadataData = await metadataResponse.json();
          console.log('Generation chain length (metadata):', metadataData.data?.generation_chain?.length);
          console.log('Generation chain (metadata):', JSON.stringify(metadataData.data?.generation_chain, null, 2));
            // Test download endpoint
          console.log('\n=== Download Endpoint ===');
          const downloadResponse = await fetch(`http://localhost:3002/api/v1/jobs/${jobId}/download`);
          const downloadData = await downloadResponse.json();
          console.log('Download response type:', downloadData.type);
          console.log('Download successful:', !downloadData.error);
          console.log('Download content:');
          console.log('---');
          console.log(downloadData.content);
          console.log('---');
          
        } else if (status === 'failed') {
          console.log('❌ Job failed:', jobData.data?.error);
          break;
        }
      } else {
        console.log('   Error checking job status');
      }
    }
    
    if (!completed && attempts >= maxAttempts) {
      console.log('⏰ Job did not complete within 30 seconds timeout');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugGenerationChain().catch(console.error);
