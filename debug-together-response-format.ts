/**
 * Debug Together AI Response Format
 * 
 * Check the actual response structure from the /models endpoint
 */

import axios from 'axios';

async function debugTogetherResponseFormat() {
  console.log('🔍 Debugging Together AI Response Format...\n');

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    console.log('❌ Please set TOGETHER_API_KEY environment variable');
    return;
  }

  try {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Check the /models endpoint response structure
    console.log('1️⃣ Checking /models endpoint response structure...');
    
    const response = await axios.get('https://api.together.xyz/models', { headers });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`✅ Response type: ${typeof response.data}`);
    console.log(`✅ Response keys: ${Object.keys(response.data)}`);
    
    if (Array.isArray(response.data)) {
      console.log(`✅ Direct array with ${response.data.length} items`);
      console.log('📋 First few items:');
      response.data.slice(0, 3).forEach((item, index) => {
        console.log(`   ${index + 1}. Type: ${typeof item}, Keys: ${Object.keys(item)}`);
        if (item.id) console.log(`      ID: ${item.id}`);
        if (item.name) console.log(`      Name: ${item.name}`);
      });
    } else if (response.data.data) {
      console.log(`✅ Wrapped in 'data' property with ${response.data.data.length} items`);
    } else if (response.data.models) {
      console.log(`✅ Wrapped in 'models' property with ${response.data.models.length} items`);
    } else {
      console.log('❓ Unknown response structure');
      console.log('📋 Response sample:', JSON.stringify(response.data, null, 2).substring(0, 1000));
    }

    // 2. Check if there's pagination
    console.log('\n2️⃣ Checking for pagination...');
    
    if (response.data.next_page_token || response.data.nextPageToken || response.data.has_more) {
      console.log('✅ Pagination detected!');
      console.log(`   Next page token: ${response.data.next_page_token || response.data.nextPageToken}`);
      console.log(`   Has more: ${response.data.has_more}`);
    } else {
      console.log('❌ No pagination detected in response');
    }

    // 3. Try with different parameters to get more models
    console.log('\n3️⃣ Testing different parameters...');
    
    const testParams = [
      '?limit=10000',
      '?per_page=10000',
      '?page_size=10000',
      '?all=true',
      '?include_all=true'
    ];

    for (const params of testParams) {
      try {
        const testResponse = await axios.get(`https://api.together.xyz/models${params}`, { headers });
        const count = Array.isArray(testResponse.data) ? 
          testResponse.data.length : 
          testResponse.data.data?.length || testResponse.data.models?.length || 'unknown';
        console.log(`✅ ${params}: ${count} models`);
        
        if (count > 1000) {
          console.log(`🎯 Found large dataset with ${params}!`);
        }
      } catch (error) {
        console.log(`❌ ${params}: ${error.response?.status || 'failed'}`);
      }
    }

    // 4. Check if we need to make multiple requests
    console.log('\n4️⃣ Testing pagination manually...');
    
    let allModels: any[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 5) { // Limit to 5 pages for testing
      try {
        const pageResponse = await axios.get(`https://api.together.xyz/models?page=${page}`, { headers });
        
        let pageModels: any[] = [];
        if (Array.isArray(pageResponse.data)) {
          pageModels = pageResponse.data;
        } else if (pageResponse.data.data) {
          pageModels = pageResponse.data.data;
        } else if (pageResponse.data.models) {
          pageModels = pageResponse.data.models;
        }
        
        console.log(`   Page ${page}: ${pageModels.length} models`);
        allModels.push(...pageModels);
        
        // Check if there are more pages
        hasMore = pageModels.length > 0 && pageModels.length >= 50; // Assume 50+ means there might be more
        page++;
        
      } catch (error) {
        console.log(`   Page ${page}: failed (${error.response?.status})`);
        hasMore = false;
      }
    }
    
    console.log(`✅ Total models from pagination: ${allModels.length}`);

    // 5. Check the actual model structure
    console.log('\n5️⃣ Analyzing model structure...');
    
    const sampleModel = Array.isArray(response.data) ? response.data[0] : 
                       response.data.data?.[0] || response.data.models?.[0];
    
    if (sampleModel) {
      console.log('📋 Sample model structure:');
      console.log(JSON.stringify(sampleModel, null, 2));
    }

    console.log('\n🎉 Response format debugging completed!');

  } catch (error) {
    console.log(`❌ Debug failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2).substring(0, 500)}`);
    }
  }
}

// Run the debug
if (require.main === module) {
  debugTogetherResponseFormat().catch(console.error);
}

export { debugTogetherResponseFormat };
