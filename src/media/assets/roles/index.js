"use strict";
/**
 * Asset Roles - Main Export
 *
 * Clean, organized export of all role-related functionality:
 * - Core media classes (Audio, Video, Text, Image)
 * - Role interfaces (AudioRole, VideoRole, etc.)
 * - Type definitions (formats, metadata)
 * - Type guards (hasAudioRole, hasVideoRole, etc.)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Core media classes
__exportStar(require("./classes"), exports);
// Role interfaces
__exportStar(require("./interfaces"), exports);
// Type definitions
__exportStar(require("./types"), exports);
// Type guards
__exportStar(require("./guards"), exports);
