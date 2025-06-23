/**
 * Debug API Test - Check what's happening with jobs
 */

async function debugAPI() {
  console.log('🔍 Debug API Test...');
  
  try {
    // Test 1: Check if server is running
    console.log('\n=== Test 1: Server Health ===');
    const healthResponse = await fetch('http://localhost:3001/api/v1/providers');
    const healthData = await healthResponse.json();
    console.log('✅ Server is running, providers:', healthData.data?.providers?.length || 0);
    
    // Test 2: Create a job
    console.log('\n=== Test 2: Create Job ===');
    const transformResponse = await fetch(
      'http://localhost:3001/api/v1/transform/openrouter/deepseek%2Fdeepseek-chat%3Afree',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'text-to-text',
          input: {
            content: 'Hello world!',
            metadata: {}
          },
          options: {
            system: 'You are a helpful assistant.',
            temperature: 0.7,
            max_tokens: 100
          }
        })
      }
    );
    
    const transformData = await transformResponse.json();
    console.log('Transform response:', transformData);
    
    if (transformData.success && transformData.data.jobId) {
      const jobId = transformData.data.jobId;
      console.log(`✅ Job created: ${jobId}`);
      
      // Test 3: Check job immediately
      console.log('\n=== Test 3: Check Job Immediately ===');
      try {
        const jobResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
        console.log('Job response status:', jobResponse.status);
        
        if (jobResponse.ok) {
          const jobData = await jobResponse.json();
          console.log('Job data:', jobData);
        } else {
          const errorText = await jobResponse.text();
          console.log('Job error:', errorText);
        }
      } catch (error) {
        console.log('Job fetch error:', error.message);
      }
      
      // Test 4: Wait and check again
      console.log('\n=== Test 4: Wait and Check Again ===');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const jobResponse2 = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
        console.log('Job response status (after wait):', jobResponse2.status);
        
        if (jobResponse2.ok) {
          const jobData2 = await jobResponse2.json();
          console.log('Job data (after wait):', JSON.stringify(jobData2, null, 2));
        } else {
          const errorText2 = await jobResponse2.text();
          console.log('Job error (after wait):', errorText2);
        }
      } catch (error) {
        console.log('Job fetch error (after wait):', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Run the debug test
debugAPI().catch(console.error);
