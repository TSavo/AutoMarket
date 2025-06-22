"use strict";
/**
 * Together AI API Client
 *
 * Client for interacting with Together.ai's unified LLM API.
 * Provides access to multiple open-source models through Together's platform.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TogetherAPIClient = void 0;
const axios_1 = __importDefault(require("axios"));
class TogetherAPIClient {
    constructor(config) {
        this.config = {
            baseUrl: 'https://api.together.xyz/v1',
            timeout: 600000, // Increase timeout for image generation
            ...config
        };
        this.client = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                const errorMessage = error.response.data?.error?.message || error.response.statusText;
                throw new Error(`Together AI API error (${error.response.status}): ${errorMessage}`);
            }
            else if (error.request) {
                throw new Error('Together AI API request failed: No response received');
            }
            else {
                throw new Error(`Together AI API error: ${error.message}`);
            }
        });
    }
    /**
     * Test connection to Together AI API
     */
    async testConnection() {
        try {
            await this.getAvailableModels();
            return true;
        }
        catch (error) {
            console.warn('Together AI connection test failed:', error);
            return false;
        }
    }
    /**
     * Get available models from Together AI
     */
    async getAvailableModels() {
        try {
            console.log('[TogetherAPIClient] Fetching models from /models endpoint...');
            const response = await this.client.get('/models');
            console.log(`[TogetherAPIClient] Response status: ${response.status}`);
            console.log(`[TogetherAPIClient] Response data type: ${typeof response.data}`);
            if (!response.data) {
                throw new Error('No data in response');
            }
            // Handle different response formats
            let models;
            if (Array.isArray(response.data)) {
                // Direct array response
                models = response.data;
            }
            else if (response.data.data && Array.isArray(response.data.data)) {
                // Wrapped in data property
                models = response.data.data;
            }
            else if (response.data.models && Array.isArray(response.data.models)) {
                // Wrapped in models property
                models = response.data.models;
            }
            else {
                console.error('[TogetherAPIClient] Unexpected response format:', JSON.stringify(response.data, null, 2).substring(0, 500));
                throw new Error(`Unexpected response format: ${typeof response.data}`);
            }
            console.log(`[TogetherAPIClient] Successfully parsed ${models.length} models`);
            return models;
        }
        catch (error) {
            console.error('[TogetherAPIClient] Failed to fetch models:', error);
            throw new Error(`Failed to fetch Together AI models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Send chat completion request
     */
    async chatCompletion(request) {
        try {
            const response = await this.client.post('/chat/completions', request);
            return response.data;
        }
        catch (error) {
            throw new Error(`Together AI chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate text using a specific model
     */
    async generateText(modelId, prompt, options) {
        const messages = [];
        if (options?.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt
            });
        }
        messages.push({
            role: 'user',
            content: prompt
        });
        const request = {
            model: modelId,
            messages,
            temperature: options?.temperature,
            max_tokens: options?.maxTokens,
            top_p: options?.topP,
            top_k: options?.topK,
            repetition_penalty: options?.repetitionPenalty,
            stop: options?.stop
        };
        const response = await this.chatCompletion(request);
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response choices returned from Together AI');
        }
        return response.choices[0].message.content;
    }
    /**
     * Get model information by ID
     */
    async getModelInfo(modelId) {
        try {
            const models = await this.getAvailableModels();
            if (!models || !Array.isArray(models)) {
                console.warn(`No models available for lookup of ${modelId}`);
                return null;
            }
            return models.find(model => model.id === modelId) || null;
        }
        catch (error) {
            console.warn(`Failed to get model info for ${modelId}:`, error);
            return null;
        }
    }
}
exports.TogetherAPIClient = TogetherAPIClient;
