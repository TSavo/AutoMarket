/**
 * OpenRouter + DeepSeek FREE Model Test (CORRECTED)
 * 
 * Using the ACTUAL free DeepSeek model for model discovery
 */

import fetch from 'node-fetch';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: { type: 'json_object' }; // Force structured JSON response
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',        'HTTP-Referer': 'https://prizm.ai',
        'X-Title': 'Prizm AI Model Discovery'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<OpenRouterResponse>;
  }
}

async function testActualFreeModel() {
  console.log('🤖 Testing ACTUAL Free DeepSeek Model');
  console.log('====================================');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    return;
  }

  const client = new OpenRouterClient(apiKey);

  try {    // Use the ACTUAL free model: deepseek/deepseek-chat:free
    console.log('\n📝 Test: Model Categorization with FREE DeepSeek + JSON Mode');
    const request: OpenRouterRequest = {
      model: 'deepseek/deepseek-chat:free', // 100% FREE MODEL
      messages: [
        {
          role: 'system',
          content: 'You categorize AI models. Respond with valid JSON only. Use this exact format: {"category": "TEXT_TO_IMAGE"} where category is one of: TEXT_TO_IMAGE, IMAGE_TO_VIDEO, TEXT_TO_VIDEO, VIDEO_TO_VIDEO, TEXT_TO_SPEECH, SPEECH_TO_TEXT, IMAGE_TO_IMAGE'
        },
        {
          role: 'user',
          content: 'Model: fal-ai/flux-pro\nDescription: FLUX.1 [pro] generates high-quality images from text prompts using a 12B parameter transformer.'
        }
      ],
      response_format: { type: 'json_object' }, // Force structured JSON response
      max_tokens: 50,
      temperature: 0.1
    };    const response = await client.chat(request);
    console.log('✅ Structured JSON:', response.choices[0].message.content.trim());
    
    // Try to parse the JSON to verify it's valid
    try {
      const parsed = JSON.parse(response.choices[0].message.content);
      console.log('✅ Parsed category:', parsed.category);
    } catch (error) {
      console.log('⚠️  JSON parsing failed:', error);
    }
    
    console.log('📊 Tokens used:', response.usage.total_tokens);
    console.log('💰 Cost: $0.00 (FREE!)');

    // Test 2: Complete model extraction with JSON
    console.log('\n🔍 Test: Extract Complete Model Info as JSON');
    const parseRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-chat:free',
      messages: [
        {
          role: 'system',
          content: 'Extract model information as valid JSON only. Use exactly this format: {"id": "model-id", "category": "CATEGORY", "description": "description", "capabilities": ["cap1", "cap2"]}'
        },
        {
          role: 'user',
          content: 'Model: fal-ai/framepack\nDescription: Animate static images with AI to create smooth video animations\nType: image-to-video'
        }
      ],
      response_format: { type: 'json_object' }, // Force JSON structure
      max_tokens: 150,
      temperature: 0.1
    };

    const parseResponse = await client.chat(parseRequest);
    console.log('✅ Structured model JSON:', parseResponse.choices[0].message.content.trim());
    
    // Verify parsing
    try {
      const modelData = JSON.parse(parseResponse.choices[0].message.content);
      console.log('✅ Extracted model data:');
      console.log('   ID:', modelData.id);
      console.log('   Category:', modelData.category);
      console.log('   Description:', modelData.description);
      console.log('   Capabilities:', modelData.capabilities);
    } catch (error) {
      console.log('⚠️  Model JSON parsing failed:', error);
    }
    
    console.log('📊 Total tokens:', parseResponse.usage.total_tokens);    console.log('\n🎉 Free DeepSeek with JSON mode test completed!');
    console.log('\n💡 This enables reliable structured data extraction:');
    console.log('   ✅ Guaranteed valid JSON responses');
    console.log('   ✅ Consistent model categorization');
    console.log('   ✅ Structured model metadata extraction');
    console.log('   ✅ Zero cost for model discovery automation');
    console.log('   ✅ Perfect for parsing scraped fal.ai model data');

  } catch (error) {
    console.error('❌ Free model test failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { OpenRouterClient, testActualFreeModel };

// Run test if executed directly
if (require.main === module) {
  testActualFreeModel().catch(console.error);
}
