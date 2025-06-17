"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFormat = void 0;
exports.isVideoAsset = isVideoAsset;
var types_1 = require("./types");
/**
 * Supported video formats
 */
var VideoFormat;
(function (VideoFormat) {
    VideoFormat["MP4"] = "mp4";
    VideoFormat["WEBM"] = "webm";
})(VideoFormat || (exports.VideoFormat = VideoFormat = {}));
/**
 * Type guard to check if an asset is a VideoAsset
 */
function isVideoAsset(asset) {
    return asset.type === types_1.MediaType.VIDEO;
}
