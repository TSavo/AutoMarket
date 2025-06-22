"use strict";
/**
 * TextToImageMixin
 *
 * Mixin to add TextToImageProvider capabilities to a provider class.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTextToImageProvider = withTextToImageProvider;
/**
 * Add TextToImageProvider capabilities to a provider
 */
function withTextToImageProvider(Base) {
    return class extends Base {
        async createTextToImageModel(modelId) {
            // Delegate to base provider's getModel method
            const model = await this.getModel(modelId);
            // TODO: Add proper type checking when TextToImageModel is defined
            return model;
        }
        getSupportedTextToImageModels() {
            // Filter supported models to only text-to-image models
            const allModels = this.getSupportedModels();
            return allModels.filter((modelId) => modelId.includes('image') || modelId.includes('flux') || modelId.includes('dalle'));
        }
        supportsTextToImageModel(modelId) {
            return this.getSupportedTextToImageModels().includes(modelId);
        }
        // ServiceManagement interface implementation
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
