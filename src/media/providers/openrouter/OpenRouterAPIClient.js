"use strict";
/**
 * OpenRouter API Client
 *
 * Client for interacting with OpenRouter's unified LLM API.
 * Provides access to multiple model providers through a single interface.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterAPIClient = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenRouterAPIClient {
    constructor(config) {
        this.config = {
            baseUrl: 'https://openrouter.ai/api/v1',
            timeout: 300000,
            ...config
        };
        this.client = axios_1.default.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                ...(this.config.httpReferer && { 'HTTP-Referer': this.config.httpReferer }),
                ...(this.config.xTitle && { 'X-Title': this.config.xTitle })
            }
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                const errorMessage = error.response.data?.error?.message || error.response.statusText;
                throw new Error(`OpenRouter API error (${error.response.status}): ${errorMessage}`);
            }
            else if (error.request) {
                throw new Error('OpenRouter API request failed: No response received');
            }
            else {
                throw new Error(`OpenRouter API error: ${error.message}`);
            }
        });
    }
    /**
     * Test connection to OpenRouter API
     */
    async testConnection() {
        try {
            await this.getAvailableModels();
            return true;
        }
        catch (error) {
            console.warn('OpenRouter connection test failed:', error);
            return false;
        }
    }
    /**
     * Get available models from OpenRouter
     */
    async getAvailableModels() {
        try {
            const response = await this.client.get('/models');
            return response.data.data;
        }
        catch (error) {
            throw new Error(`Failed to fetch OpenRouter models: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            throw new Error(`OpenRouter chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            top_p: options?.topP
        };
        const response = await this.chatCompletion(request);
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response choices returned from OpenRouter');
        }
        return response.choices[0].message.content;
    }
}
exports.OpenRouterAPIClient = OpenRouterAPIClient;
