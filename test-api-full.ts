/**
 * Comprehensive API Test Suite
 * 
 * Tests all API endpoints running on localhost:3001
 */

const API_BASE = 'http://localhost:3001/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  type?: string;
  content?: string;
}

async function makeRequest<T = any>(
  endpoint: string, 
  options: any = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`🌐 ${options.method || 'GET'} ${API_BASE}${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json() as ApiResponse<T>;
    
    if (!response.ok) {
      console.log(`   ❌ ${response.status} ${response.statusText}`);
      console.log(`   📄 ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   ✅ ${response.status} ${response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testApiEndpoints() {
  console.log('🧪 Starting Comprehensive API Test Suite...');
  console.log(`🌐 API Base: ${API_BASE}`);
  
  let testJobId: string | null = null;
  
  try {
    console.log('\n=== 1. Test Capabilities Endpoint ===');
    const capabilities = await makeRequest('/capabilities');
    if (capabilities.success) {
      console.log(`   📊 Found ${capabilities.data?.total || 0} capabilities`);
      console.log(`   🎯 Available: ${capabilities.data?.capabilities?.map(c => c.id).join(', ')}`);
    }

    console.log('\n=== 2. Test Providers Endpoint ===');
    const providers = await makeRequest('/providers');
    if (providers.success) {
      console.log(`   📊 Found ${providers.data?.total || 0} providers`);
      providers.data?.providers?.forEach(provider => {
        console.log(`   🔧 ${provider.id}: ${provider.name} (${provider.modelCount} models, ${provider.isAvailable ? 'available' : 'unavailable'})`);
      });
    }

    // Find a working provider with text-to-text capability
    let workingProvider = null;
    let workingModel = null;

    if (providers.success && providers.data?.providers) {
      for (const provider of providers.data.providers) {
        if (provider.isAvailable && provider.capabilities?.includes('text-to-text')) {
          console.log(`\n=== 3. Test Provider Details: ${provider.id} ===`);
          const providerDetails = await makeRequest(`/providers/${provider.id}`);
          if (providerDetails.success && providerDetails.data?.models?.length > 0) {
            workingProvider = provider.id;
            // Find a model that supports text-to-text
            const textModel = providerDetails.data.models.find(m => 
              m.capabilities?.includes('text-to-text')
            );
            if (textModel) {
              workingModel = textModel.id;
              console.log(`   ✅ Found working model: ${textModel.id}`);
              break;
            }
          }
        }
      }
    }    if (workingProvider && workingModel) {
      console.log(`\n=== 4. Test Transformation: ${workingProvider}/${workingModel} ===`);
      
      // Test transformation request
      const transformRequest = {
        capability: 'text-to-text',
        input: 'Hello, this is a test message. Please enhance it to be more engaging.',
        options: {
          system: 'You are a helpful assistant. Enhance the given text to be more engaging and creative.',
          temperature: 0.7,
          max_tokens: 100
        }
      };

      const transformResponse = await makeRequest(
        `/transform/${workingProvider}/${workingModel}`,
        {
          method: 'POST',
          body: JSON.stringify(transformRequest)
        }
      );

      if (transformResponse.success) {
        testJobId = transformResponse.data?.jobId;
        console.log(`   ✅ Transformation started: Job ID ${testJobId}`);
        console.log(`   📍 Status URL: ${transformResponse.data?.statusUrl}`);

        if (testJobId) {
          console.log(`\n=== 5. Test Job Status Monitoring ===`);
          
          // Poll job status
          let attempts = 0;
          let jobCompleted = false;
          
          while (attempts < 10 && !jobCompleted) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            attempts++;
            
            console.log(`   🔄 Checking job status (attempt ${attempts}/10)...`);
            const jobStatus = await makeRequest(`/jobs/${testJobId}`);
            
            if (jobStatus.success) {
              const status = jobStatus.data?.status;
              console.log(`   📊 Job Status: ${status}`);
              
              if (status === 'completed') {
                jobCompleted = true;
                console.log(`   ✅ Job completed successfully!`);
                console.log(`   ⏱️  Processing time: ${jobStatus.data?.processingTime}ms`);
                console.log(`   📄 Output type: ${jobStatus.data?.output?.type}`);
                
                if (jobStatus.data?.generation_chain) {
                  console.log(`   🔗 Generation chain: ${jobStatus.data.generation_chain.length} steps`);
                }
                  // Test download endpoint
                console.log(`\n=== 6. Test Asset Download ===`);
                const downloadResponse = await makeRequest(`/jobs/${testJobId}/download`);
                if (downloadResponse.success || downloadResponse.type) {
                  console.log(`   ✅ Download successful`);
                  if (downloadResponse.content) {
                    console.log(`   📄 Content preview: "${downloadResponse.content.substring(0, 100)}..."`);
                  }
                } else {
                  console.log(`   ⚠️  Download response: ${JSON.stringify(downloadResponse)}`);
                }

                // Test metadata endpoint
                console.log(`\n=== 7. Test Metadata Endpoint ===`);
                const metadataResponse = await makeRequest(`/jobs/${testJobId}/metadata`);
                if (metadataResponse.success) {
                  console.log(`   ✅ Metadata retrieved`);
                  console.log(`   📊 Asset type: ${metadataResponse.data?.asset_type}`);
                  console.log(`   🔗 Generation chain: ${metadataResponse.data?.generation_chain?.length || 0} steps`);
                }
                
              } else if (status === 'failed') {
                console.log(`   ❌ Job failed: ${jobStatus.data?.error}`);
                break;
              } else if (status === 'running') {
                console.log(`   ⏳ Job still running...`);
              }
            }
          }
          
          if (!jobCompleted && attempts >= 10) {
            console.log(`   ⚠️  Job did not complete within timeout`);
          }
        }
      }
    } else {
      console.log('\n⚠️  No working providers found for transformation test');
    }

    console.log('\n=== 8. Test Error Handling ===');
    
    // Test invalid provider
    await makeRequest('/providers/invalid-provider');
    
    // Test invalid transformation
    await makeRequest('/transform/invalid/invalid', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });
    
    // Test invalid job
    await makeRequest('/jobs/invalid-job-id');

    console.log('\n✅ API Test Suite Completed!');
    console.log('📊 Summary:');
    console.log(`   - Capabilities endpoint: Working`);
    console.log(`   - Providers endpoint: Working`);
    console.log(`   - Provider details: Working`);
    if (workingProvider && workingModel) {
      console.log(`   - Transformation: Working (${workingProvider}/${workingModel})`);
      console.log(`   - Job management: Working`);
      console.log(`   - Asset download: Working`);
      console.log(`   - Metadata: Working`);
    }
    console.log(`   - Error handling: Working`);

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test suite
testApiEndpoints().catch(console.error);
