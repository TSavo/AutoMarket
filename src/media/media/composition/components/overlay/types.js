"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SizePreset = exports.OverlayPosition = exports.PositionPreset = void 0;
/**
 * Position preset options for overlay positioning
 */
var PositionPreset;
(function (PositionPreset) {
    PositionPreset["BOTTOM_CENTER"] = "bottom-center";
    PositionPreset["BOTTOM_LEFT"] = "bottom-left";
    PositionPreset["BOTTOM_RIGHT"] = "bottom-right";
    PositionPreset["TOP_CENTER"] = "top-center";
    PositionPreset["TOP_LEFT"] = "top-left";
    PositionPreset["TOP_RIGHT"] = "top-right";
    PositionPreset["CENTER_LEFT"] = "center-left";
    PositionPreset["CENTER_RIGHT"] = "center-right";
    PositionPreset["CENTER"] = "center";
})(PositionPreset || (exports.PositionPreset = PositionPreset = {}));
/**
 * Legacy position enum for backward compatibility
 */
var OverlayPosition;
(function (OverlayPosition) {
    OverlayPosition["TOP_LEFT"] = "top-left";
    OverlayPosition["TOP_CENTER"] = "top-center";
    OverlayPosition["TOP_RIGHT"] = "top-right";
    OverlayPosition["MIDDLE_LEFT"] = "middle-left";
    OverlayPosition["MIDDLE_CENTER"] = "middle-center";
    OverlayPosition["MIDDLE_RIGHT"] = "middle-right";
    OverlayPosition["BOTTOM_LEFT"] = "bottom-left";
    OverlayPosition["BOTTOM_CENTER"] = "bottom-center";
    OverlayPosition["BOTTOM_RIGHT"] = "bottom-right";
})(OverlayPosition || (exports.OverlayPosition = OverlayPosition = {}));
/**
 * Size preset options for overlay sizing
 */
var SizePreset;
(function (SizePreset) {
    SizePreset[SizePreset["QUARTER"] = 25] = "QUARTER";
    SizePreset[SizePreset["HALF"] = 50] = "HALF";
    SizePreset[SizePreset["THREE_QUARTER"] = 75] = "THREE_QUARTER";
    SizePreset[SizePreset["FULL"] = 100] = "FULL";
})(SizePreset || (exports.SizePreset = SizePreset = {}));
