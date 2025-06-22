"use strict";
/**
 * VideoToVideoMixin
 *
 * Mixin to add VideoToVideoProvider capabilities to a provider class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withVideoToVideoProvider = withVideoToVideoProvider;
/**
 * Add VideoToVideoProvider capabilities to a provider
 */
function withVideoToVideoProvider(Base) {
    return class extends Base {
        async createVideoToVideoModel(modelId) {
            // Delegate to base provider's getModel method
            const model = await this.getModel(modelId);
            // TODO: Add proper type checking when VideoToVideoModel is defined
            return model;
        }
        getSupportedVideoToVideoModels() {
            // Filter supported models to only video-to-video models
            const allModels = this.getSupportedModels();
            return allModels.filter((modelId) => modelId.includes('video') || modelId.includes('enhance') || modelId.includes('upscale') ||
                modelId.includes('interpolation') || modelId.includes('stylize'));
        }
        supportsVideoToVideoModel(modelId) {
            return this.getSupportedVideoToVideoModels().includes(modelId);
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
