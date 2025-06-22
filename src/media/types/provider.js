"use strict";
/**
 * Core Provider System Types
 *
 * Defines the capability-driven provider architecture where:
 * Provider → Capabilities → Models → Invocation Methods
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatus = exports.ProviderConfigSchema = exports.GenerationRequestSchema = exports.ProviderType = exports.MediaCapability = void 0;
const zod_1 = require("zod");
/**
 * Media transformation capabilities that providers can support.
 *
 * Each capability maps directly to a specific Model class and transform signature.
 * This enables deterministic model instantiation based on input/output types.
 */
var MediaCapability;
(function (MediaCapability) {
    // Text transformation capabilities
    MediaCapability["TEXT_TO_TEXT"] = "text-to-text";
    // Image generation and transformation capabilities  
    MediaCapability["TEXT_TO_IMAGE"] = "text-to-image";
    MediaCapability["IMAGE_TO_IMAGE"] = "image-to-image";
    MediaCapability["IMAGE_TO_TEXT"] = "image-to-text";
    // Video generation and transformation capabilities
    MediaCapability["TEXT_TO_VIDEO"] = "text-to-video";
    MediaCapability["IMAGE_TO_VIDEO"] = "image-to-video";
    MediaCapability["VIDEO_TO_VIDEO"] = "video-to-video";
    MediaCapability["VIDEO_TO_IMAGE"] = "video-to-image";
    MediaCapability["VIDEO_TO_AUDIO"] = "video-to-audio";
    // Audio generation and transformation capabilities
    MediaCapability["TEXT_TO_AUDIO"] = "text-to-audio";
    MediaCapability["AUDIO_TO_TEXT"] = "audio-to-text";
    MediaCapability["AUDIO_TO_AUDIO"] = "audio-to-audio";
    // 3D generation capabilities
    MediaCapability["TEXT_TO_3D"] = "text-to-3d";
    MediaCapability["IMAGE_TO_3D"] = "image-to-3d"; // ImageTo3DModel: transform(image) -> Model3D
})(MediaCapability || (exports.MediaCapability = MediaCapability = {}));
/**
 * Provider execution types
 */
var ProviderType;
(function (ProviderType) {
    ProviderType["LOCAL"] = "local";
    ProviderType["REMOTE"] = "remote"; // Cloud APIs
})(ProviderType || (exports.ProviderType = ProviderType = {}));
// Zod schemas for validation
exports.GenerationRequestSchema = zod_1.z.object({
    capability: zod_1.z.nativeEnum(MediaCapability),
    modelId: zod_1.z.string(),
    parameters: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.ProviderConfigSchema = zod_1.z.object({
    apiKey: zod_1.z.string().optional(),
    baseUrl: zod_1.z.string().url().optional(),
    timeout: zod_1.z.number().positive().optional(),
    retries: zod_1.z.number().min(0).optional(),
    environment: zod_1.z.record(zod_1.z.string()).optional(),
    dockerImage: zod_1.z.string().optional(),
    scriptPath: zod_1.z.string().optional()
});
/**
 * Status of a generation job
 */
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["RUNNING"] = "running";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
// ============================================================================
// PROVIDER SYSTEM TYPES  
// ============================================================================
