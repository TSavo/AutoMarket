"use strict";
/**
 * OpenRouter Text-to-Text Model
 *
 * Concrete implementation of TextToTextModel for OpenRouter's unified LLM API.
 * Provides access to multiple model providers through OpenRouter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterTextToTextModel = void 0;
const TextToTextModel_1 = require("../../models/abstracts/TextToTextModel");
const roles_1 = require("../../assets/roles");
class OpenRouterTextToTextModel extends TextToTextModel_1.TextToTextModel {
    constructor(config) {
        const metadata = {
            id: config.modelId,
            name: config.metadata?.name || `OpenRouter ${config.modelId}`,
            description: config.metadata?.description || `OpenRouter text-to-text model: ${config.modelId}`,
            version: config.metadata?.version || '1.0.0',
            provider: 'openrouter',
            capabilities: ['text-generation'],
            inputTypes: ['text'],
            outputTypes: ['text'],
            ...config.metadata
        };
        super(metadata);
        this.apiClient = config.apiClient;
        this.modelId = config.modelId;
    }
    /**
     * Transform text to text using OpenRouter
     */
    async transform(input, options) {
        const startTime = Date.now(); // Get text from the TextRole
        const text = await input.asText();
        // Validate text data
        if (!text.isValid()) {
            throw new Error('Invalid text data provided');
        }
        try {
            // Generate text using OpenRouter API
            const generatedText = await this.apiClient.generateText(this.modelId, text.content, {
                temperature: options?.temperature,
                maxTokens: options?.maxOutputTokens,
                topP: options?.topP,
                systemPrompt: options?.systemPrompt
            });
            // Calculate processing time
            const processingTime = Date.now() - startTime;
            // Create Text result
            const result = new roles_1.Text(generatedText, text.language || 'auto', // Preserve input language
            1.0, // High confidence for successful generation
            {
                processingTime,
                model: this.modelId,
                provider: 'openrouter',
                inputTokens: text.content.split(' ').length, // Rough estimate
                outputTokens: generatedText.split(' ').length, // Rough estimate
                temperature: options?.temperature,
                maxTokens: options?.maxOutputTokens,
                systemPrompt: options?.systemPrompt
            }, text.sourceAsset // Preserve source Asset reference
            );
            return result;
        }
        catch (error) {
            throw new Error(`OpenRouter text generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if the model is available
     */
    async isAvailable() {
        try {
            return await this.apiClient.testConnection();
        }
        catch (error) {
            console.warn(`OpenRouter model ${this.modelId} availability check failed:`, error);
            return false;
        }
    }
    /**
     * Get model-specific information
     */
    getModelInfo() {
        return {
            id: this.modelId,
            provider: 'openrouter',
            capabilities: ['text-generation', 'chat', 'completion']
        };
    }
    /**
     * Estimate token count for input text (rough approximation)
     */
    estimateTokens(text) {
        // Very rough estimation: ~4 characters per token for English text
        return Math.ceil(text.length / 4);
    }
    /**
     * Get supported parameters for this model
     */
    getSupportedParameters() {
        return [
            'temperature',
            'maxOutputTokens',
            'topP',
            'systemPrompt',
            'frequencyPenalty',
            'presencePenalty'
        ];
    }
}
exports.OpenRouterTextToTextModel = OpenRouterTextToTextModel;
