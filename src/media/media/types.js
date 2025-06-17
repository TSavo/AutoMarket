"use strict";
/**
 * Media asset types and interfaces for the Horizon City Stories project
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPurpose = exports.AspectRatio = exports.MediaType = void 0;
/**
 * Supported media types
 */
var MediaType;
(function (MediaType) {
    MediaType["IMAGE"] = "image";
    MediaType["VIDEO"] = "video";
    MediaType["AUDIO"] = "audio";
    MediaType["FONT"] = "font";
})(MediaType || (exports.MediaType = MediaType = {}));
/**
 * Common aspect ratios
 */
var AspectRatio;
(function (AspectRatio) {
    AspectRatio["SQUARE"] = "1:1";
    AspectRatio["PORTRAIT"] = "3:4";
    AspectRatio["LANDSCAPE"] = "4:3";
    AspectRatio["WIDESCREEN"] = "16:9";
    AspectRatio["ULTRAWIDE"] = "21:9";
    AspectRatio["CINEMA"] = "2.35:1";
    AspectRatio["VERTICAL"] = "9:16";
    AspectRatio["CUSTOM"] = "custom";
})(AspectRatio || (exports.AspectRatio = AspectRatio = {}));
/**
 * Content purpose tags
 */
var ContentPurpose;
(function (ContentPurpose) {
    ContentPurpose["INTRO"] = "intro";
    ContentPurpose["OUTRO"] = "outro";
    ContentPurpose["OVERLAY"] = "overlay";
    ContentPurpose["BACKGROUND"] = "background";
    ContentPurpose["CONTENT"] = "content";
    ContentPurpose["THUMBNAIL"] = "thumbnail";
    ContentPurpose["ICON"] = "icon";
    ContentPurpose["BANNER"] = "banner";
    ContentPurpose["LOGO"] = "logo";
    ContentPurpose["HERO"] = "hero";
    ContentPurpose["PORTRAIT"] = "portrait";
    ContentPurpose["DOCUMENT"] = "document";
})(ContentPurpose || (exports.ContentPurpose = ContentPurpose = {}));
