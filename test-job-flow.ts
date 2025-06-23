/**
 * Test job creation and immediate status check
 */

async function testJobFlow() {
  console.log('🧪 Testing Job Creation and Status...');
  
  try {
    // Step 1: Create a job
    console.log('\n=== 1. Creating Job ===');
    const transformResponse = await fetch('http://localhost:3001/api/v1/transform/openrouter/mistralai/mistral-7b-instruct:free', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        capability: 'text-to-text',
        input: 'Test message',
        options: {
          system: 'You are a helpful assistant.',
          temperature: 0.7,
          max_tokens: 50
        }
      })
    });
    
    console.log(`Transform Status: ${transformResponse.status}`);
    const transformData = await transformResponse.json();
    console.log('Transform Response:', JSON.stringify(transformData, null, 2));
    
    if (transformData.success && transformData.data?.jobId) {
      const jobId = transformData.data.jobId;
      console.log(`\n=== 2. Checking Job Status: ${jobId} ===`);
      
      // Step 2: Immediately check job status
      const jobResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
      console.log(`Job Status: ${jobResponse.status}`);
      
      const jobData = await jobResponse.text();
      console.log('Job Response:', jobData);
      
      // Step 3: Wait a bit and check again
      console.log('\n=== 3. Waiting 3 seconds and checking again ===');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const jobResponse2 = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
      console.log(`Job Status (after 3s): ${jobResponse2.status}`);
      
      const jobData2 = await jobResponse2.text();
      console.log('Job Response (after 3s):', jobData2);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testJobFlow().catch(console.error);
