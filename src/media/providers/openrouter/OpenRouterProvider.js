"use strict";
/**
 * OpenRouter Provider with TextToText Support
 *
 * Provider that integrates with OpenRouter's unified LLM API.
 * Provides access to multiple model providers through a single interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterProvider = void 0;
const provider_1 = require("../../types/provider");
const OpenRouterAPIClient_1 = require("./OpenRouterAPIClient");
const OpenRouterTextToTextModel_1 = require("./OpenRouterTextToTextModel");
class OpenRouterProvider {
    get models() {
        // Return discovered models if available, otherwise return popular models
        if (this.discoveredModels.size > 0) {
            return Array.from(this.discoveredModels.values());
        }
        return this.popularModels.map(modelId => ({
            id: modelId,
            name: this.getModelDisplayName(modelId), description: `OpenRouter model: ${modelId}`,
            capabilities: [provider_1.MediaCapability.TEXT_TO_TEXT, provider_1.MediaCapability.TEXT_TO_TEXT],
            parameters: {
                temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
                max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
                top_p: { type: 'number', min: 0, max: 1, default: 1 }
            },
            pricing: {
                inputCost: 0, // Would need real pricing data from OpenRouter
                outputCost: 0,
                currency: 'USD'
            }
        }));
    }
    async configure(config) {
        this.config = config;
        if (!config.apiKey) {
            throw new Error('OpenRouter API key is required');
        }
        const openRouterConfig = {
            apiKey: config.apiKey,
            httpReferer: 'https://automarket.ai',
            xTitle: 'AutoMarket AI'
        };
        this.apiClient = new OpenRouterAPIClient_1.OpenRouterAPIClient(openRouterConfig);
        // Optionally discover available models
        await this.discoverModels();
    }
    async isAvailable() {
        if (!this.apiClient) {
            return false;
        }
        try {
            return await this.apiClient.testConnection();
        }
        catch (error) {
            console.warn('OpenRouter availability check failed:', error);
            return false;
        }
    }
    getModelsForCapability(capability) {
        if (capability === provider_1.MediaCapability.TEXT_TO_TEXT) {
            return this.models;
        }
        return [];
    }
    async getHealth() {
        const isAvailable = await this.isAvailable();
        return {
            status: isAvailable ? 'healthy' : 'unhealthy',
            uptime: process.uptime(),
            activeJobs: 0, // Models handle their own jobs
            queuedJobs: 0,
            lastError: isAvailable ? undefined : 'API connection failed'
        };
    }
    // TextToTextProvider interface implementation
    async createTextToTextModel(modelId) {
        if (!this.apiClient) {
            throw new Error('Provider not configured');
        }
        if (!this.supportsTextToTextModel(modelId)) {
            throw new Error(`Model '${modelId}' is not supported by OpenRouter provider`);
        }
        return new OpenRouterTextToTextModel_1.OpenRouterTextToTextModel({
            apiClient: this.apiClient,
            modelId
        });
    }
    /**
     * Get a model instance by ID with automatic type detection
     */
    async getModel(modelId) {
        // For OpenRouter, all models are text-to-text
        return this.createTextToTextModel(modelId);
    }
    getSupportedTextToTextModels() {
        return this.models.map(model => model.id);
    }
    supportsTextToTextModel(modelId) {
        return this.getSupportedTextToTextModels().includes(modelId);
    }
    // Service management (no-ops for remote API providers)
    async startService() {
        return true; // Remote APIs are always "started"
    }
    async stopService() {
        return true; // No service to stop for remote APIs
    }
    async getServiceStatus() {
        const isAvailable = await this.isAvailable();
        return {
            running: true, // Remote APIs are always "running"
            healthy: isAvailable,
            error: isAvailable ? undefined : 'API connection failed'
        };
    }
    // MediaProvider interface methods (required but delegated to models)
    async generate(request) {
        throw new Error('OpenRouterProvider should use Model instances for generation, not direct generation');
    }
    // Helper methods
    async discoverModels() {
        if (!this.apiClient) {
            return;
        }
        try {
            const availableModels = await this.apiClient.getAvailableModels();
            for (const model of availableModels) {
                const providerModel = {
                    id: model.id,
                    name: model.name,
                    description: model.description || `OpenRouter model: ${model.id}`,
                    capabilities: [provider_1.MediaCapability.TEXT_TO_TEXT, provider_1.MediaCapability.TEXT_TO_TEXT],
                    parameters: {
                        temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
                        max_tokens: { type: 'number', min: 1, max: 4096, default: 1024 },
                        top_p: { type: 'number', min: 0, max: 1, default: 1 }
                    }
                };
                this.discoveredModels.set(model.id, providerModel);
            }
            console.log(`[OpenRouterProvider] Discovered ${this.discoveredModels.size} models`);
        }
        catch (error) {
            console.warn('[OpenRouterProvider] Model discovery failed, using popular models fallback:', error.message);
        }
    }
    getModelDisplayName(modelId) {
        const parts = modelId.split('/');
        if (parts.length === 2) {
            const [provider, model] = parts;
            return `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${model}`;
        }
        return modelId;
    }
    /**
     * Constructor automatically configures from environment variables
     */
    constructor() {
        this.id = 'openrouter';
        this.name = 'OpenRouter';
        this.type = provider_1.ProviderType.REMOTE;
        this.capabilities = [
            provider_1.MediaCapability.TEXT_TO_TEXT,
            provider_1.MediaCapability.TEXT_TO_TEXT
        ];
        this.discoveredModels = new Map();
        // Pre-configured popular models (can be extended with dynamic discovery)
        this.popularModels = [
            'anthropic/claude-3.5-sonnet',
            'anthropic/claude-3-haiku',
            'openai/gpt-4o',
            'openai/gpt-4o-mini',
            'openai/gpt-3.5-turbo',
            'google/gemini-pro-1.5',
            'meta-llama/llama-3.2-90b-vision-instruct',
            'meta-llama/llama-3.1-70b-instruct',
            'qwen/qwen-2.5-72b-instruct',
            'deepseek/deepseek-chat',
            'deepseek/deepseek-r1-distill-llama-70b', // Free model
            'mistralai/mixtral-8x7b-instruct',
            'microsoft/phi-3-medium-4k-instruct'
        ];
        // Auto-configure from environment variables (async but non-blocking)
        this.autoConfigureFromEnv().catch(error => {
            // Silent fail - provider will just not be available until manually configured
        });
    }
    /**
     * Automatically configure from environment variables
     */
    async autoConfigureFromEnv() {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (apiKey) {
            try {
                await this.configure({
                    apiKey,
                    timeout: 300000,
                    retries: 3
                });
            }
            catch (error) {
                console.warn(`[OpenRouterProvider] Auto-configuration failed: ${error.message}`);
            }
        }
    }
}
exports.OpenRouterProvider = OpenRouterProvider;
