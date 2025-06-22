"use strict";
/**
 * VideoToAudioMixin
 *
 * Mixin to add VideoToAudioProvider capabilities to a provider class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withVideoToAudioProvider = withVideoToAudioProvider;
const VideoToAudioModel_1 = require("../../models/abstracts/VideoToAudioModel");
/**
 * Add VideoToAudioProvider capabilities to a provider
 */
function withVideoToAudioProvider(Base) {
    return class extends Base {
        async createVideoToAudioModel(modelId) {
            // Delegate to base provider's getModel method
            const model = await this.getModel(modelId);
            if (!(model instanceof VideoToAudioModel_1.VideoToAudioModel)) {
                throw new Error(`Model '${modelId}' is not a VideoToAudioModel`);
            }
            return model;
        }
        getSupportedVideoToAudioModels() {
            // Filter supported models to only video-to-audio models
            const allModels = this.getSupportedModels();
            return allModels.filter((modelId) => modelId.includes('ffmpeg') || modelId.includes('video-to-audio') ||
                modelId.includes('extract-audio'));
        }
        supportsVideoToAudioModel(modelId) {
            return this.getSupportedVideoToAudioModels().includes(modelId);
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
