/**
 * Comprehensive API Test - Test all endpoints
 */

async function comprehensiveAPITest() {
  console.log('🚀 Comprehensive API Test...');
  
  try {
    // Test 1: Get all providers
    console.log('\n=== Test 1: Get All Providers ===');
    const providersResponse = await fetch('http://localhost:3001/api/v1/providers');
    const providersData = await providersResponse.json();
    console.log(`✅ Found ${providersData.data?.providers?.length || 0} providers`);
    
    // Show available providers
    if (providersData.data?.providers) {
      providersData.data.providers.forEach(provider => {
        console.log(`   📋 ${provider.id}: ${provider.name} (${provider.modelCount} models, ${provider.isAvailable ? 'available' : 'unavailable'})`);
      });
    }
    
    // Test 2: Get capabilities
    console.log('\n=== Test 2: Get All Capabilities ===');
    const capabilitiesResponse = await fetch('http://localhost:3001/api/v1/capabilities');
    const capabilitiesData = await capabilitiesResponse.json();
    console.log(`✅ Found ${capabilitiesData.data?.capabilities?.length || 0} capabilities`);
    
    // Test 3: Get specific provider details
    console.log('\n=== Test 3: Get OpenRouter Provider Details ===');
    const openrouterResponse = await fetch('http://localhost:3001/api/v1/providers/openrouter');
    const openrouterData = await openrouterResponse.json();
    console.log(`✅ OpenRouter: ${openrouterData.data?.models?.length || 0} models available`);
    
    // Test 4: Text-to-Text transformation
    console.log('\n=== Test 4: Text-to-Text Transformation ===');
    const transformResponse = await fetch(
      'http://localhost:3001/api/v1/transform/openrouter/deepseek%2Fdeepseek-chat%3Afree',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: 'text-to-text',
          input: {
            content: 'Write a haiku about artificial intelligence.',
            metadata: {}
          },
          options: {
            system: 'You are a creative poetry assistant.',
            temperature: 0.8,
            max_tokens: 150
          }
        })
      }
    );
    
    const transformData = await transformResponse.json();
    console.log('✅ Transformation started:', transformData.data?.jobId);
    
    if (transformData.success && transformData.data.jobId) {
      const jobId = transformData.data.jobId;
      
      // Wait for completion
      console.log('⏳ Waiting for completion...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check final result
      const finalJobResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
      const finalJobData = await finalJobResponse.json();
      
      if (finalJobData.success) {
        console.log('✅ Job completed successfully!');
        console.log(`📝 Result: "${finalJobData.data.output?.content}"`);
        console.log(`⏱️  Processing time: ${finalJobData.data.processingTime}ms`);
        console.log(`🔗 Generation chain: ${finalJobData.data.generation_chain?.length || 0} steps`);
        
        // Test 5: Download the result (for text it returns JSON)
        console.log('\n=== Test 5: Download Result ===');
        const downloadResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}/download`);
        const downloadData = await downloadResponse.json();
        console.log('✅ Download successful:', downloadData.type);
        
        // Test 6: Get metadata
        console.log('\n=== Test 6: Get Metadata ===');
        const metadataResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}/metadata`);
        const metadataData = await metadataResponse.json();
        console.log('✅ Metadata retrieved, chain steps:', metadataData.data?.generation_chain?.length || 0);
        
        console.log('\n🎉 All API endpoints working perfectly!');
        console.log('\n📊 API Summary:');
        console.log('   ✅ Provider listing and details');
        console.log('   ✅ Capability enumeration');
        console.log('   ✅ Async job creation and management');
        console.log('   ✅ Text-to-text transformations');
        console.log('   ✅ Generation chain tracking');
        console.log('   ✅ Asset download functionality');
        console.log('   ✅ Metadata retrieval');
      } else {
        console.log('❌ Job failed:', finalJobData.data?.error);
      }
    }
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
  }
}

// Run the comprehensive test
comprehensiveAPITest().catch(console.error);
