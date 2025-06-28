/**
 * OpenRouter Model Discovery Test
 * 
 * Get the actual model list from OpenRouter and find free models
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
        'Content-Type': 'application/json',        'HTTP-Referer': 'https://prizm.ai', // Optional: your site URL
        'X-Title': 'Prizm AI Model Discovery' // Optional: your app name
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

async function testOpenRouterDeepSeek() {
  console.log('🤖 Testing OpenRouter + DeepSeek Free Model');
  console.log('===============================================');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENROUTER_API_KEY environment variable not set');
    return;
  }

  const client = new OpenRouterClient(apiKey);

  try {    // Test 1: Basic chat completion
    console.log('\n📝 Test 1: Basic Chat Completion');
    const basicRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-r1-distill-llama-70b', // Free model
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that provides concise, accurate responses.'
        },
        {
          role: 'user',
          content: 'What is 2 + 2? Just give me the number.'
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    };

    const basicResponse = await client.chat(basicRequest);
    console.log('✅ Basic response:', basicResponse.choices[0].message.content);
    console.log('📊 Tokens used:', basicResponse.usage.total_tokens);

    // Test 2: fal.ai model categorization task
    console.log('\n🎯 Test 2: AI Model Categorization');    const categorizationRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-r1-distill-llama-70b',
      messages: [
        {
          role: 'system',
          content: `You are an AI model classification expert. Given a model name and description, classify it into one of these categories:
- TEXT_TO_IMAGE
- IMAGE_TO_VIDEO
- TEXT_TO_VIDEO
- VIDEO_TO_VIDEO
- TEXT_TO_SPEECH
- SPEECH_TO_TEXT
- IMAGE_TO_IMAGE

Respond with ONLY the category name.`
        },
        {
          role: 'user',
          content: 'Model: fal-ai/flux-pro\nDescription: FLUX.1 [pro] is a 12 billion parameter flow transformer that generates high-quality images from text prompts.'
        }
      ],
      max_tokens: 20,
      temperature: 0.1
    };

    const categorizationResponse = await client.chat(categorizationRequest);
    console.log('✅ Category detected:', categorizationResponse.choices[0].message.content.trim());

    // Test 3: Model parameter extraction
    console.log('\n⚙️ Test 3: Parameter Extraction');    const parameterRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-r1-distill-llama-70b',
      messages: [
        {
          role: 'system',
          content: `Extract common parameters for AI image generation models. Return a JSON object with parameter names and their likely types/ranges. Be concise.`
        },
        {
          role: 'user',
          content: 'For a text-to-image model like FLUX Pro, what parameters would it typically accept?'
        }
      ],
      max_tokens: 200,
      temperature: 0.2
    };

    const parameterResponse = await client.chat(parameterRequest);
    console.log('✅ Suggested parameters:', parameterResponse.choices[0].message.content);

    // Test 4: Model discovery from HTML parsing assistance
    console.log('\n🔍 Test 4: HTML Parsing Assistance');    const parsingRequest: OpenRouterRequest = {
      model: 'deepseek/deepseek-r1-distill-llama-70b',
      messages: [
        {
          role: 'system',
          content: `You help extract structured data from HTML. Given HTML content from fal.ai model pages, extract model information in JSON format.`
        },
        {
          role: 'user',
          content: `From this HTML snippet, extract the model ID and category:
<div class="model-card">
  <a href="/models/fal-ai/framepack">
    <h3>FramePack Animation</h3>
    <p>Animate static images with AI</p>
    <span class="category">image-to-video</span>
  </a>
</div>

Return JSON: {"id": "...", "category": "...", "description": "..."}`
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    };

    const parsingResponse = await client.chat(parsingRequest);
    console.log('✅ Extracted data:', parsingResponse.choices[0].message.content);

    console.log('\n🎉 OpenRouter + DeepSeek tests completed successfully!');
    console.log('\n💡 Potential uses for model discovery:');
    console.log('   ✅ Categorize scraped models automatically');
    console.log('   ✅ Extract parameter schemas from descriptions');
    console.log('   ✅ Parse HTML content from fal.ai model pages');
    console.log('   ✅ Generate model metadata from partial information');
    console.log('   ✅ FREE - No API costs for basic model discovery tasks');

  } catch (error) {
    console.error('❌ OpenRouter test failed:', error);
    throw error;
  }
}

// Export for use in other modules
export { OpenRouterClient, testOpenRouterDeepSeek };

// Run test if executed directly
if (require.main === module) {
  testOpenRouterDeepSeek().catch(console.error);
}
