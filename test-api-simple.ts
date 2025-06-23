/**
 * Simple API Test - Debug transformation request
 */

async function simpleAPITest() {
  console.log('🔍 Simple API Debug Test...');
  
  try {
    const API_BASE = 'http://localhost:3001/api/v1';
    
    // Test basic endpoints first
    console.log('\n=== 1. Test Server Health ===');
    const capResponse = await fetch(`${API_BASE}/capabilities`);
    console.log(`Capabilities: ${capResponse.status} ${capResponse.statusText}`);
    
    const providersResponse = await fetch(`${API_BASE}/providers`);
    console.log(`Providers: ${providersResponse.status} ${providersResponse.statusText}`);
    
    if (providersResponse.ok) {
      const providersData = await providersResponse.json();
      console.log(`Found ${providersData.data?.total || 0} providers`);
      
      // Find working provider
      const workingProvider = providersData.data?.providers?.find(p => 
        p.isAvailable && p.modelCount > 0 && p.capabilities?.includes('text-to-text')
      );
      
      if (workingProvider) {
        console.log(`\n=== 2. Test Provider: ${workingProvider.id} ===`);
        
        // Get provider details
        const detailResponse = await fetch(`${API_BASE}/providers/${workingProvider.id}`);
        if (detailResponse.ok) {
          const details = await detailResponse.json();
          console.log(`Provider details: ${detailResponse.status} ${detailResponse.statusText}`);
          
          const textModel = details.data?.models?.find(m => 
            m.capabilities?.includes('text-to-text')
          );
          
          if (textModel) {
            console.log(`\n=== 3. Test Transformation ===`);
            console.log(`Provider: ${workingProvider.id}`);
            console.log(`Model: ${textModel.id}`);            // Create properly formatted request
            const transformRequest = {
              capability: 'text-to-text',
              input: 'Hello world, please make this more interesting.', // Simple string input
              options: {
                system: 'You are a helpful assistant.',  // Fixed: use 'system' not 'systemPrompt'
                temperature: 0.7,
                max_tokens: 100
              }
            };
            
            console.log('Request body:', JSON.stringify(transformRequest, null, 2));
            
            const transformResponse = await fetch(
              `${API_BASE}/transform/${workingProvider.id}/${encodeURIComponent(textModel.id)}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(transformRequest)
              }
            );
            
            console.log(`Transform response: ${transformResponse.status} ${transformResponse.statusText}`);
            
            const responseText = await transformResponse.text();
            console.log('Response body:', responseText.substring(0, 500));
            
            if (transformResponse.ok) {
              const transformData = JSON.parse(responseText);
              if (transformData.success && transformData.data?.jobId) {
                console.log(`✅ Job created: ${transformData.data.jobId}`);
                
                // Poll for completion
                const jobId = transformData.data.jobId;
                let attempts = 0;
                
                while (attempts < 5) {
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  attempts++;
                  
                  const jobResponse = await fetch(`${API_BASE}/jobs/${jobId}`);
                  if (jobResponse.ok) {
                    const jobData = await jobResponse.json();
                    console.log(`Job status (${attempts}/5): ${jobData.data?.status}`);
                    
                    if (jobData.data?.status === 'completed') {
                      console.log('✅ Job completed!');
                      console.log(`Output: ${JSON.stringify(jobData.data?.output, null, 2)}`);
                      break;
                    } else if (jobData.data?.status === 'failed') {
                      console.log(`❌ Job failed: ${jobData.data?.error}`);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

simpleAPITest().catch(console.error);
