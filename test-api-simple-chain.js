/**
 * Simple API Chain Test - Focus on generation chain
 */

async function testChain() {
  console.log('🔗 Testing Generation Chain...');
  
  try {
    // Create job
    const response = await fetch(
      'http://localhost:3001/api/v1/transform/openrouter/deepseek%2Fdeepseek-chat%3Afree',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'text-to-text',
          input: {
            content: 'Say hello',
            metadata: {}
          },
          options: {
            system: 'Be brief.',
            temperature: 0.1,
            max_tokens: 20
          }
        })
      }
    );
    
    const data = await response.json();
    console.log('✅ Job created:', data.data?.jobId);
    
    if (data.success && data.data.jobId) {
      const jobId = data.data.jobId;
      
      // Poll for completion
      let attempts = 0;
      let completed = false;
      
      while (attempts < 10 && !completed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        try {
          const jobResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
          
          if (jobResponse.ok) {
            const jobData = await jobResponse.json();
            console.log(`Attempt ${attempts}: Status = ${jobData.data?.status}`);
            
            if (jobData.data?.status === 'completed') {
              completed = true;
              console.log('\n✅ Job completed!');
              console.log('Output:', jobData.data.output?.content);
              console.log('Generation chain steps:', jobData.data.generation_chain?.length || 0);
              
              if (jobData.data.generation_chain) {
                jobData.data.generation_chain.forEach((step, i) => {
                  console.log(`  Step ${step.step}: ${step.asset_type} via ${step.model || 'unknown'}`);
                });
              }
              
              // Test metadata endpoint
              const metaResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}/metadata`);
              if (metaResponse.ok) {
                const metaData = await metaResponse.json();
                console.log('Metadata chain steps:', metaData.data?.generation_chain?.length || 0);
              }
              
            } else if (jobData.data?.status === 'failed') {
              console.log('❌ Job failed:', jobData.data.error);
              break;
            }
          } else {
            console.log(`Attempt ${attempts}: HTTP ${jobResponse.status}`);
          }
        } catch (pollError) {
          console.log(`Attempt ${attempts}: Error - ${pollError.message}`);
        }
      }
      
      if (!completed) {
        console.log('⏰ Job did not complete within timeout');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChain().catch(console.error);
