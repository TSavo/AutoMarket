"use strict";
/**
 * Together AI Provider with TextToText Support
 *
 * Provider that integrates with Together.ai's unified LLM API.
 * Provides access to open-source models through Together's platform.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TogetherProvider = void 0;
const provider_1 = require("../../types/provider");
const TogetherAPIClient_1 = require("./TogetherAPIClient");
const TogetherTextToTextModel_1 = require("./TogetherTextToTextModel");
const TogetherTextToImageModel_1 = require("./TogetherTextToImageModel");
const TogetherTextToAudioModel_1 = require("./TogetherTextToAudioModel");
class TogetherProvider {
    get models() {
        // Return discovered models if available, otherwise return popular models
        if (this.discoveredModels.size > 0) {
            return Array.from(this.discoveredModels.values());
        }
        // Combine text, image, and audio models
        const textModels = this.popularTextModels.map(modelId => ({
            id: modelId,
            name: this.getModelDisplayName(modelId),
            description: `Together AI text model: ${modelId}`,
            capabilities: [provider_1.MediaCapability.TEXT_TO_TEXT, provider_1.MediaCapability.TEXT_TO_TEXT],
            parameters: {
                temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
                max_tokens: { type: 'number', min: 1, max: 8192, default: 1024 },
                top_p: { type: 'number', min: 0, max: 1, default: 0.9 },
                top_k: { type: 'number', min: 1, max: 100, default: 50 },
                repetition_penalty: { type: 'number', min: 0.1, max: 2, default: 1 }
            },
            pricing: {
                inputCost: 0, // Many Together models are free
                outputCost: 0,
                currency: 'USD'
            }
        }));
        const imageModels = this.popularImageModels.map(modelId => ({
            id: modelId,
            name: this.getModelDisplayName(modelId),
            description: `Together AI image model: ${modelId}`,
            capabilities: [provider_1.MediaCapability.TEXT_TO_IMAGE],
            parameters: this.getImageParametersForModel(modelId),
            pricing: {
                inputCost: 0, // Many FLUX models are free
                outputCost: 0,
                currency: 'USD'
            }
        }));
        const audioModels = this.popularAudioModels.map(modelId => ({
            id: modelId,
            name: this.getModelDisplayName(modelId),
            description: `Together AI audio model: ${modelId}`,
            capabilities: [provider_1.MediaCapability.TEXT_TO_AUDIO],
            parameters: {
                voice: { type: 'string', default: 'default' },
                speed: { type: 'number', min: 0.5, max: 2.0, default: 1.0 },
                output_format: { type: 'string', enum: ['mp3', 'wav'], default: 'mp3' },
                sample_rate: { type: 'number', enum: [22050, 44100, 48000], default: 44100 }
            },
            pricing: {
                inputCost: 0.065, // Cartesia Sonic pricing: $65 per 1M characters = $0.065 per 1K characters
                outputCost: 0,
                currency: 'USD',
                unit: 'per_1k_characters'
            }
        }));
        return [...textModels, ...imageModels, ...audioModels];
    }
    async configure(config) {
        this.config = config;
        if (!config.apiKey) {
            throw new Error('Together AI API key is required');
        }
        const togetherConfig = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || 'https://api.together.xyz/v1',
            timeout: config.timeout || 30000
        };
        this.apiClient = new TogetherAPIClient_1.TogetherAPIClient(togetherConfig);
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
            console.warn('Together AI availability check failed:', error);
            return false;
        }
    }
    getModelsForCapability(capability) {
        return this.models.filter(model => model.capabilities.includes(capability));
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
            throw new Error(`Model '${modelId}' is not supported by Together AI provider`);
        }
        return new TogetherTextToTextModel_1.TogetherTextToTextModel({
            apiClient: this.apiClient,
            modelId
        });
    }
    getSupportedTextToTextModels() {
        return this.models.map(model => model.id);
    }
    supportsTextToTextModel(modelId) {
        return this.getSupportedTextToTextModels().includes(modelId);
    }
    // TextToImageProvider interface implementation
    async createTextToImageModel(modelId) {
        if (!this.apiClient) {
            throw new Error('Provider not configured');
        }
        if (!this.supportsTextToImageModel(modelId)) {
            throw new Error(`Image model '${modelId}' is not supported by Together AI provider`);
        }
        // Get model metadata dynamically
        const modelMetadata = await this.apiClient.getModelInfo(modelId);
        return new TogetherTextToImageModel_1.TogetherTextToImageModel({
            apiClient: this.apiClient,
            modelId,
            modelMetadata: modelMetadata || undefined
        });
    }
    getSupportedTextToImageModels() {
        return this.getModelsForCapability(provider_1.MediaCapability.TEXT_TO_IMAGE).map(model => model.id);
    }
    supportsTextToImageModel(modelId) {
        return this.getSupportedTextToImageModels().includes(modelId);
    }
    // TextToAudioProvider interface implementation
    async createTextToAudioModel(modelId) {
        if (!this.apiClient) {
            throw new Error('Provider not configured');
        }
        if (!this.supportsTextToAudioModel(modelId)) {
            throw new Error(`Audio model '${modelId}' is not supported by Together AI provider`);
        }
        // Get model metadata dynamically
        const modelMetadata = await this.apiClient.getModelInfo(modelId);
        return new TogetherTextToAudioModel_1.TogetherTextToAudioModel({
            apiClient: this.apiClient,
            modelId,
            modelMetadata: modelMetadata || undefined
        });
    }
    getSupportedTextToAudioModels() {
        return this.getModelsForCapability(provider_1.MediaCapability.TEXT_TO_AUDIO).map(model => model.id);
    }
    supportsTextToAudioModel(modelId) {
        return this.getSupportedTextToAudioModels().includes(modelId);
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
        throw new Error('TogetherProvider should use Model instances for generation, not direct generation');
    }
    // Helper methods
    async discoverModels() {
        if (!this.apiClient) {
            return;
        }
        try {
            console.log('[TogetherProvider] Starting model discovery...');
            const availableModels = await this.apiClient.getAvailableModels();
            if (!availableModels || !Array.isArray(availableModels)) {
                throw new Error(`Invalid models response: ${typeof availableModels}`);
            }
            console.log(`[TogetherProvider] Retrieved ${availableModels.length} models from API`);
            let textModelCount = 0;
            let imageModelCount = 0;
            let audioModelCount = 0;
            let skippedCount = 0;
            for (const model of availableModels) {
                // Determine model capabilities based on type and name
                const capabilities = this.determineModelCapabilities(model);
                // Skip models that don't match our supported capabilities
                if (capabilities.length === 0) {
                    skippedCount++;
                    continue;
                }
                // Count by type
                if (capabilities.includes(provider_1.MediaCapability.TEXT_TO_TEXT)) {
                    textModelCount++;
                }
                if (capabilities.includes(provider_1.MediaCapability.TEXT_TO_IMAGE)) {
                    imageModelCount++;
                }
                if (capabilities.includes(provider_1.MediaCapability.TEXT_TO_AUDIO)) {
                    audioModelCount++;
                }
                // Set parameters based on model type
                const parameters = this.getParametersForCapabilities(capabilities, model.id);
                const providerModel = {
                    id: model.id,
                    name: model.display_name || model.id,
                    description: model.description || `Together AI model: ${model.id}`,
                    capabilities,
                    parameters,
                    pricing: {
                        inputCost: model.pricing?.input || 0,
                        outputCost: model.pricing?.output || 0,
                        currency: 'USD'
                    }
                };
                this.discoveredModels.set(model.id, providerModel);
            }
            console.log(`[TogetherProvider] Discovery complete:`);
            console.log(`  - Total discovered: ${this.discoveredModels.size}`);
            console.log(`  - Text models: ${textModelCount}`);
            console.log(`  - Image models: ${imageModelCount}`);
            console.log(`  - Audio models: ${audioModelCount}`);
            console.log(`  - Skipped: ${skippedCount}`);
        }
        catch (error) {
            console.error('[TogetherProvider] Model discovery failed:', error);
            console.warn('[TogetherProvider] Using popular models fallback');
        }
    }
    getModelDisplayName(modelId) {
        const parts = modelId.split('/');
        if (parts.length === 2) {
            const [org, model] = parts;
            return `${org.charAt(0).toUpperCase() + org.slice(1)} ${model.replace(/-/g, ' ')}`;
        }
        return modelId;
    }
    /**
     * Get free models available on Together AI
     */
    getFreeModels() {
        return this.models.filter(model => model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0);
    }
    /**
     * Check if a specific model is free
     */
    isModelFree(modelId) {
        const model = this.models.find(m => m.id === modelId);
        return model ? (model.pricing?.inputCost === 0 && model.pricing?.outputCost === 0) : false;
    }
    /**
     * Determine model capabilities based on model metadata (improved classification)
     */
    determineModelCapabilities(model) {
        const capabilities = [];
        const modelId = model.id.toLowerCase();
        const displayName = (model.display_name || '').toLowerCase();
        const description = (model.description || '').toLowerCase();
        const modelType = (model.type || '').toLowerCase();
        // Image generation models - be more comprehensive
        const imageIndicators = [
            'flux', 'stable-diffusion', 'sd-', 'dall-e', 'midjourney', 'imagen',
            'kandinsky', 'playground', 'realvisxl', 'juggernaut', 'dreamshaper',
            'proteus', 'pixart', 'kolors', 'hunyuan', 'recraft'
        ];
        const isImageModel = modelType === 'image' ||
            imageIndicators.some(indicator => modelId.includes(indicator) ||
                displayName.includes(indicator) ||
                description.includes(indicator)) ||
            description.includes('image generation') ||
            description.includes('text-to-image') ||
            displayName.includes('image');
        if (isImageModel) {
            capabilities.push(provider_1.MediaCapability.TEXT_TO_IMAGE);
        }
        // Text generation models - be more inclusive but exclude image-only models
        const textIndicators = [
            'llama', 'mistral', 'qwen', 'gemma', 'phi', 'deepseek', 'yi', 'nous',
            'openchat', 'wizardlm', 'vicuna', 'alpaca', 'claude', 'gpt', 'palm',
            'flan', 'ul2', 'opt', 'bloom', 'pythia', 'galactica', 'codegen',
            'starcoder', 'santacoder', 'replit', 'incite', 'redpajama', 'falcon',
            'mpt', 'dolly', 'stablelm', 'koala', 'baize', 'chatglm', 'moss',
            'instruct', 'chat', 'turbo', 'base'
        ];
        const isTextModel = !isImageModel && ( // Don't classify image models as text models
        modelType === 'chat' ||
            modelType === 'language' ||
            modelType === 'text' ||
            textIndicators.some(indicator => modelId.includes(indicator) ||
                displayName.includes(indicator)) ||
            description.includes('language model') ||
            description.includes('text generation') ||
            description.includes('conversation') ||
            description.includes('instruct') ||
            description.includes('chat') ||
            (!modelType && !isImageModel) // Default to text if no clear type and not image
        );
        if (isTextModel) {
            capabilities.push(provider_1.MediaCapability.TEXT_TO_TEXT, provider_1.MediaCapability.TEXT_TO_TEXT);
        }
        // Audio generation models
        const audioIndicators = [
            'sonic', 'cartesia', 'audio', 'speech', 'voice', 'tts', 'text-to-speech'
        ];
        const isAudioModel = modelType === 'audio' ||
            audioIndicators.some(indicator => modelId.includes(indicator) ||
                displayName.includes(indicator) ||
                description.includes(indicator)) ||
            description.includes('audio generation') ||
            description.includes('text-to-audio') ||
            description.includes('text-to-speech');
        if (isAudioModel) {
            capabilities.push(provider_1.MediaCapability.TEXT_TO_AUDIO);
        }
        // Debug logging for classification
        if (capabilities.length === 0) {
            console.log(`[TogetherProvider] Unclassified model: ${model.id} (type: ${modelType}, display: ${displayName})`);
        }
        return capabilities;
    }
    /**
     * Get appropriate parameters based on model capabilities (dynamic)
     */
    getParametersForCapabilities(capabilities, modelId) {
        if (capabilities.includes(provider_1.MediaCapability.TEXT_TO_IMAGE)) {
            // For image models, use dynamic parameters
            return this.getImageParametersForModel(modelId || '');
        }
        else if (capabilities.includes(provider_1.MediaCapability.TEXT_TO_AUDIO)) {
            // For audio models, use audio-specific parameters
            return this.getAudioParametersForModel(modelId || '');
        }
        else {
            // For text models, use standard LLM parameters
            return {
                temperature: { type: 'number', min: 0, max: 2, default: 0.7 },
                max_tokens: { type: 'number', min: 1, max: 8192, default: 1024 },
                top_p: { type: 'number', min: 0, max: 1, default: 0.9 },
                top_k: { type: 'number', min: 1, max: 100, default: 50 },
                repetition_penalty: { type: 'number', min: 0.1, max: 2, default: 1 }
            };
        }
    }
    /**
     * Get models by type for easier access
     */
    getTextModels() {
        return this.getModelsForCapability(provider_1.MediaCapability.TEXT_TO_TEXT);
    }
    getImageModels() {
        return this.getModelsForCapability(provider_1.MediaCapability.TEXT_TO_IMAGE);
    }
    getAudioModels() {
        return this.getModelsForCapability(provider_1.MediaCapability.TEXT_TO_AUDIO);
    }
    /**
     * Get dynamic image parameters based on model metadata
     */
    getImageParametersForModel(modelId) {
        // TODO: Parse actual parameter schema from model metadata when available
        // For now, return generic image generation parameters
        return {
            width: { type: 'number', min: 256, max: 2048, default: 1024 },
            height: { type: 'number', min: 256, max: 2048, default: 1024 },
            steps: { type: 'number', min: 1, max: 50, default: 20 },
            seed: { type: 'number', min: 0, max: 2147483647, default: null },
            negative_prompt: { type: 'string', default: '' }
        };
    }
    /**
     * Get dynamic audio parameters based on model metadata
     */
    getAudioParametersForModel(modelId) {
        // TODO: Parse actual parameter schema from model metadata when available
        // For now, return generic audio generation parameters
        return {
            voice: { type: 'string', default: 'default' },
            speed: { type: 'number', min: 0.5, max: 2.0, default: 1.0 },
            output_format: { type: 'string', enum: ['mp3', 'wav'], default: 'mp3' },
            sample_rate: { type: 'number', enum: [22050, 44100, 48000], default: 44100 },
            language: { type: 'string', default: 'en' }
        };
    }
    /**
     * Get a model instance by ID with automatic type detection
     */
    async getModel(modelId) {
        // Determine model type based on model capabilities
        const modelMetadata = await this.apiClient?.getModelInfo(modelId);
        if (!modelMetadata) {
            throw new Error(`Model ${modelId} not found`);
        }
        // Together AI models are typically text-to-text, but some support other capabilities
        if (modelId.includes('image') || modelId.includes('vision')) {
            return this.createTextToImageModel(modelId);
        }
        if (modelId.includes('audio') || modelId.includes('speech') || modelId.includes('tts')) {
            return this.createTextToAudioModel(modelId);
        }
        // Default to text-to-text
        return this.createTextToTextModel(modelId);
    }
    /**
     * Constructor automatically configures from environment variables
     */
    constructor() {
        this.id = 'together';
        this.name = 'Together AI';
        this.type = provider_1.ProviderType.REMOTE;
        this.capabilities = [
            provider_1.MediaCapability.TEXT_TO_TEXT,
            provider_1.MediaCapability.TEXT_TO_TEXT,
            provider_1.MediaCapability.TEXT_TO_IMAGE,
            provider_1.MediaCapability.TEXT_TO_AUDIO
        ];
        this.discoveredModels = new Map();
        // Pre-configured popular text models
        this.popularTextModels = [
            'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
            'meta-llama/Llama-3.2-3B-Instruct-Turbo',
            'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
            'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
            'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free',
            'lgai/exaone-3-5-32b-instruct',
            'mistralai/Mixtral-8x7B-Instruct-v0.1',
            'mistralai/Mistral-7B-Instruct-v0.3',
            'Qwen/Qwen2.5-7B-Instruct-Turbo',
            'Qwen/Qwen2.5-72B-Instruct-Turbo',
            'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
            'teknium/OpenHermes-2.5-Mistral-7B'
        ];
        // Pre-configured popular image models
        this.popularImageModels = [
            'black-forest-labs/FLUX.1-schnell-Free',
            'black-forest-labs/FLUX.1-schnell',
            'black-forest-labs/FLUX.1-dev',
            'black-forest-labs/FLUX.1-pro',
            'black-forest-labs/FLUX.1.1-pro',
            'black-forest-labs/FLUX.1-redux',
            'black-forest-labs/FLUX.1-canny',
            'black-forest-labs/FLUX.1-depth',
            'black-forest-labs/FLUX.1-kontext-max',
            'black-forest-labs/FLUX.1-kontext-pro',
            'black-forest-labs/FLUX.1-dev-lora'
        ];
        // Pre-configured audio models
        this.popularAudioModels = [
            'cartesia/sonic',
            'cartesia/sonic-2'
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
        const apiKey = process.env.TOGETHER_API_KEY;
        if (apiKey) {
            try {
                await this.configure({
                    apiKey,
                    timeout: 30000,
                    retries: 3
                });
            }
            catch (error) {
                console.warn(`[TogetherProvider] Auto-configuration failed: ${error.message}`);
            }
        }
    }
}
exports.TogetherProvider = TogetherProvider;
