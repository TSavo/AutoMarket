"use strict";
/**
 * TextToAudioMixin
 *
 * Mixin to add TextToAudioProvider capabilities to a provider class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTextToAudioProvider = withTextToAudioProvider;
const TextToAudioModel_1 = require("../../models/abstracts/TextToAudioModel");
/**
 * Add TextToAudioProvider capabilities to a provider
 */
function withTextToAudioProvider(Base) {
    return class extends Base {
        async createTextToAudioModel(modelId) {
            // Delegate to base provider's getModel method
            const model = await this.getModel(modelId);
            if (!(model instanceof TextToAudioModel_1.TextToAudioModel)) {
                throw new Error(`Model '${modelId}' is not a TextToAudioModel`);
            }
            return model;
        }
        getSupportedTextToAudioModels() {
            // Filter supported models to only TTS/TTA models
            const allModels = this.getSupportedModels();
            return allModels.filter((modelId) => modelId.includes('tts') || modelId.includes('text-to-speech') ||
                modelId.includes('text-to-audio') || modelId.includes('chatterbox'));
        }
        supportsTextToAudioModel(modelId) {
            return this.getSupportedTextToAudioModels().includes(modelId);
        }
        async startService() {
            // Delegate to base provider's startService method if it exists
            if (typeof this.startService === 'function') {
                return await this.startService();
            }
            return true; // No-op for providers that don't need service management
        }
        async stopService() {
            // Delegate to base provider's stopService method if it exists
            if (typeof this.stopService === 'function') {
                return await this.stopService();
            }
            return true; // No-op for providers that don't need service management
        }
        async getServiceStatus() {
            // Delegate to base provider's getServiceStatus method if it exists
            if (typeof this.getServiceStatus === 'function') {
                return await this.getServiceStatus();
            }
            return { running: true, healthy: true }; // Default for providers that don't manage services
        }
    };
}
