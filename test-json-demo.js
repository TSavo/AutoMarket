/**
 * Simple Structured JSON Demo
 * 
 * Demonstrates the new structured JSON support for TextToText models
 */

async function demonstrateStructuredJSON() {
  console.log('🎯 Structured JSON Support Demo');
  console.log('===============================\n');

  const baseUrl = 'http://localhost:3001/api/v1/transform/openrouter/deepseek%2Fdeepseek-r1-distill-llama-70b';

  // Test 1: Traditional text response
  console.log('1️⃣ Traditional Text Response:');
  await testTextResponse(baseUrl);

  console.log('\n2️⃣ Structured JSON Response:');
  await testJSONResponse(baseUrl);

  console.log('\n3️⃣ Complex JSON Schema:');
  await testComplexJSON(baseUrl);
}

async function testTextResponse(baseUrl) {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'text-to-text',
        input: {
          content: 'What is the capital of France?',
          metadata: {}
        },
        options: {
          systemPrompt: 'You are a helpful assistant.',
          temperature: 0.7,
          maxTokens: 50
        }
      })
    });

    const result = await response.json();
    if (result.success) {
      const jobId = result.data.jobId;
      const finalResult = await waitForCompletion(jobId);
      console.log('   ✅ Text Output:', finalResult);
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function testJSONResponse(baseUrl) {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'text-to-text',
        input: {
          content: 'Model: fal-ai/flux-pro\nDescription: FLUX.1 [pro] generates high-quality images from text prompts.',
          metadata: {}
        },
        options: {
          systemPrompt: 'Categorize AI models. Return JSON: {"category": "...", "type": "...", "confidence": 0.95}',
          responseFormat: 'json',
          temperature: 0.1,
          maxTokens: 100
        }
      })
    });

    const result = await response.json();
    if (result.success) {
      const jobId = result.data.jobId;
      const finalResult = await waitForCompletion(jobId);
      console.log('   ✅ Raw JSON:', finalResult);
      
      try {
        const parsed = JSON.parse(finalResult);
        console.log('   ✅ Parsed Structure:', parsed);
      } catch (error) {
        console.log('   ❌ Invalid JSON returned');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function testComplexJSON(baseUrl) {
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capability: 'text-to-text',
        input: {
          content: 'Extract parameters for a text-to-image AI model.',
          metadata: {}
        },
        options: {
          systemPrompt: 'Return JSON schema: {"parameters": {"prompt": {"type": "string", "required": true}, "width": {"type": "number", "default": 512}}}',
          responseFormat: { type: 'json_object' },
          temperature: 0.2,
          maxTokens: 200
        }
      })
    });

    const result = await response.json();
    if (result.success) {
      const jobId = result.data.jobId;
      const finalResult = await waitForCompletion(jobId);
      console.log('   ✅ Complex JSON Schema:');
      
      try {
        const schema = JSON.parse(finalResult);
        console.log('   📋', JSON.stringify(schema, null, 2));
      } catch (error) {
        console.log('   ❌ Invalid JSON schema returned');
        console.log('   📄 Raw output:', finalResult);
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function waitForCompletion(jobId) {
  console.log(`   ⏳ Waiting for job ${jobId} to complete...`);
  
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const jobResponse = await fetch(`http://localhost:3001/api/v1/jobs/${jobId}`);
    const jobData = await jobResponse.json();
    
    if (jobData.success && jobData.data?.status === 'completed') {
      return jobData.data?.output?.content;
    } else if (jobData.success && jobData.data?.status === 'failed') {
      throw new Error(jobData.data?.error || 'Job failed');
    }
  }
  
  throw new Error('Job timed out');
}

// Show usage examples
function showUsageExamples() {
  console.log(`
📖 How to Use Structured JSON:

// Option 1: Simple JSON format
{
  "options": {
    "responseFormat": "json",
    "systemPrompt": "Return valid JSON only"
  }
}

// Option 2: Explicit JSON object format  
{
  "options": {
    "responseFormat": { "type": "json_object" },
    "systemPrompt": "Respond with structured data"
  }
}

🎯 Use Cases:
✅ Model categorization and discovery
✅ Parameter schema extraction  
✅ Structured data extraction from text
✅ API response formatting
✅ Automated data processing pipelines

🌟 Provider Support:
✅ OpenRouter (DeepSeek, Claude, GPT, etc.)
✅ Together AI (Llama, Qwen, etc.)
✅ Backward compatible with existing text responses
  `);
}

if (typeof require !== 'undefined' && require.main === module) {
  demonstrateStructuredJSON()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      showUsageExamples();
    })
    .catch(console.error);
}

module.exports = { demonstrateStructuredJSON };
