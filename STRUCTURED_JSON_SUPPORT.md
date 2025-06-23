# Structured JSON Support for TextToText Models

## 🎯 Overview

We've successfully added structured JSON response support to the TextToText interface, enabling OpenRouter and Together AI providers to return properly formatted JSON output for models that support it. This feature is essential for automated data processing, model discovery, and structured information extraction.

## ✅ Implementation Status

**✅ COMPLETED**: All structured JSON functionality has been implemented and tested successfully.

### Supported Providers
- **OpenRouter** (DeepSeek, Claude, GPT-4, etc.)
- **Together AI** (Llama, Qwen, etc.)

### Backward Compatibility
- **✅ Fully backward compatible** with existing text responses
- **✅ Graceful fallback** to plain text when JSON formatting fails

## 🔧 Technical Implementation

### 1. Enhanced TextToText Interface

```typescript
export interface TextToTextOptions {
  // ... existing options ...
  /** Response format for structured output */
  responseFormat?: 'text' | 'json' | { type: 'json_object' };
}
```

### 2. API Client Updates

**OpenRouter API Client:**
```typescript
export interface OpenRouterChatRequest {
  // ... existing fields ...
  response_format?: { type: 'json_object' };
}
```

**Together API Client:**
```typescript
export interface TogetherChatRequest {
  // ... existing fields ...
  response_format?: { type: 'json_object' };
}
```

### 3. Model-Specific Options

**OpenRouter:**
```typescript
export interface OpenRouterTextToTextOptions extends TextToTextOptions {
  responseFormat?: 'text' | 'json' | { type: 'json_object' };
}
```

**Together:**
```typescript
export interface TogetherTextToTextOptions extends TextToTextOptions {
  responseFormat?: 'text' | 'json' | { type: 'json_object' };
}
```

## 📖 Usage Examples

### Basic JSON Response
```javascript
// API call
fetch('/api/v1/transform/openrouter/deepseek%2Fdeepseek-r1-distill-llama-70b', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    capability: 'text-to-text',
    input: {
      content: 'Model: fal-ai/flux-pro\nDescription: FLUX.1 [pro] generates high-quality images from text prompts.',
      metadata: {}
    },
    options: {
      systemPrompt: 'Categorize AI models. Return JSON: {"category": "...", "confidence": 0.95}',
      responseFormat: 'json',  // ✅ NEW: Request JSON format
      temperature: 0.1,
      maxTokens: 100
    }
  })
});

// Response: {"category": "TEXT_TO_IMAGE", "confidence": 0.95}
```

### Explicit JSON Object Format
```javascript
const options = {
  systemPrompt: 'Extract parameters. Return structured JSON.',
  responseFormat: { type: 'json_object' },  // ✅ Explicit format
  temperature: 0.2
};
```

### Model Integration
```typescript
// Using the TextToText model directly
const model = await provider.createTextToTextModel('deepseek/deepseek-r1-distill-llama-70b');

const result = await model.transform(inputText, {
  systemPrompt: 'Return JSON with model categorization',
  responseFormat: 'json',
  temperature: 0.1
});

const parsed = JSON.parse(result.content);
console.log('Category:', parsed.category);
```

## 🎯 Use Cases

### 1. Model Categorization
```json
{
  "category": "TEXT_TO_IMAGE",
  "type": "diffusion",
  "confidence": 0.95
}
```

### 2. Parameter Schema Extraction
```json
{
  "parameters": {
    "prompt": {"type": "string", "required": true},
    "width": {"type": "number", "default": 512},
    "height": {"type": "number", "default": 512}
  }
}
```

### 3. Structured Data Extraction
```json
{
  "title": "FLUX Pro",
  "description": "High-quality image generation",
  "capabilities": ["text-to-image", "high-resolution"],
  "pricing": {"input_cost": 0.05, "currency": "USD"}
}
```

## 🧪 Test Results

**✅ All tests passing successfully:**

1. **Traditional Text Response**: ✅ Working
2. **Structured JSON Response**: ✅ Working 
   - Output: `{ "category": "image generation", "type": "diffusion model", "confidence": 0.95 }`
3. **Complex JSON Schema**: ✅ Working
   - Proper JSON parsing and structure validation
4. **Backward Compatibility**: ✅ Confirmed

## 🔄 Response Format Options

| Format | Description | Example |
|--------|-------------|---------|
| `'text'` (default) | Plain text response | `"The capital of France is Paris."` |
| `'json'` | Simple JSON format request | `{"category": "TEXT_TO_IMAGE"}` |
| `{ type: 'json_object' }` | Explicit JSON object | `{"parameters": {...}}` |

## 🚀 Benefits

1. **Structured Output**: Reliable JSON formatting for automated processing
2. **Data Extraction**: Perfect for model discovery and categorization
3. **API Integration**: Seamless integration with existing workflows
4. **Provider Support**: Works with both OpenRouter and Together AI
5. **Backward Compatible**: No breaking changes to existing code
6. **Type Safety**: Proper TypeScript interfaces for all options

## 🔧 Provider Configuration

Both providers automatically handle the response format conversion:

- **Input**: `responseFormat: 'json'` or `responseFormat: { type: 'json_object' }`
- **API Translation**: Converts to provider-specific `response_format: { type: 'json_object' }`
- **Output**: Properly formatted JSON strings

## 📊 Performance

- **No Performance Impact**: JSON formatting is handled at the LLM level
- **Efficient Processing**: Direct JSON output reduces parsing overhead
- **Reliable Results**: Structured format reduces output variability

## 🎉 Conclusion

The structured JSON support is now fully implemented and ready for production use. This enhancement significantly improves the platform's capabilities for automated data processing, model discovery, and structured information extraction while maintaining full backward compatibility.

**Ready for immediate use in:**
- Model categorization workflows
- Parameter schema extraction
- Automated data processing pipelines
- API response formatting
- Structured content generation
