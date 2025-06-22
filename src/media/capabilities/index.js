"use strict";
/**
 * Provider Capabilities - Main Export
 *
 * Centralized export for all provider capability interfaces, mixins, and guards.
 * This provides a clean API for importing provider capability functionality.
 *
 * These interfaces define what capabilities providers can offer (text-to-image,
 * audio-to-text, etc.) - distinct from asset roles which define data types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProviderRoles = exports.hasTextGenerationRole = exports.hasTextToTextRole = exports.hasTextToImageRole = exports.hasVideoToVideoRole = exports.hasTextToVideoRole = exports.hasVideoToAudioRole = exports.hasTextToAudioRole = exports.hasAudioToTextRole = exports.withVideoToVideoProvider = exports.withTextToVideoProvider = exports.withTextToImageProvider = exports.withVideoToAudioProvider = exports.withTextToAudioProvider = exports.withAudioToTextProvider = void 0;
// Mixins
var AudioToTextMixin_1 = require("./mixins/AudioToTextMixin");
Object.defineProperty(exports, "withAudioToTextProvider", { enumerable: true, get: function () { return AudioToTextMixin_1.withAudioToTextProvider; } });
var TextToAudioMixin_1 = require("./mixins/TextToAudioMixin");
Object.defineProperty(exports, "withTextToAudioProvider", { enumerable: true, get: function () { return TextToAudioMixin_1.withTextToAudioProvider; } });
var VideoToAudioMixin_1 = require("./mixins/VideoToAudioMixin");
Object.defineProperty(exports, "withVideoToAudioProvider", { enumerable: true, get: function () { return VideoToAudioMixin_1.withVideoToAudioProvider; } });
var TextToImageMixin_1 = require("./mixins/TextToImageMixin");
Object.defineProperty(exports, "withTextToImageProvider", { enumerable: true, get: function () { return TextToImageMixin_1.withTextToImageProvider; } });
var TextToVideoMixin_1 = require("./mixins/TextToVideoMixin");
Object.defineProperty(exports, "withTextToVideoProvider", { enumerable: true, get: function () { return TextToVideoMixin_1.withTextToVideoProvider; } });
var VideoToVideoMixin_1 = require("./mixins/VideoToVideoMixin");
Object.defineProperty(exports, "withVideoToVideoProvider", { enumerable: true, get: function () { return VideoToVideoMixin_1.withVideoToVideoProvider; } });
// Guards
var ProviderRoleGuards_1 = require("./guards/ProviderRoleGuards");
Object.defineProperty(exports, "hasAudioToTextRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasAudioToTextRole; } });
Object.defineProperty(exports, "hasTextToAudioRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasTextToAudioRole; } });
Object.defineProperty(exports, "hasVideoToAudioRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasVideoToAudioRole; } });
Object.defineProperty(exports, "hasTextToVideoRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasTextToVideoRole; } });
Object.defineProperty(exports, "hasVideoToVideoRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasVideoToVideoRole; } });
Object.defineProperty(exports, "hasTextToImageRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasTextToImageRole; } });
Object.defineProperty(exports, "hasTextToTextRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasTextToTextRole; } });
Object.defineProperty(exports, "hasTextGenerationRole", { enumerable: true, get: function () { return ProviderRoleGuards_1.hasTextGenerationRole; } });
Object.defineProperty(exports, "getProviderRoles", { enumerable: true, get: function () { return ProviderRoleGuards_1.getProviderRoles; } });
