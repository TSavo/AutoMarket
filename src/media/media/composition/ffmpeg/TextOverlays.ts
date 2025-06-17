/**
 * TextOverlays.ts
 *
 * Provides text overlay functionality for FFMPEG video composition
 */

import { OverlayPosition } from '../models/Clip';

// Re-export OverlayPosition for use in UI components
export { OverlayPosition };

/**
 * Font options for text overlays
 */
export interface FontOptions {
  family?: string;
  size?: number;
  color?: string;
  borderWidth?: number;
  borderColor?: string;
  shadowX?: number;
  shadowY?: number;
  shadowColor?: string;
  lineSpacing?: number;
  letterSpacing?: number;
  bold?: boolean;
  italic?: boolean;
}

/**
 * Text animation options
 */
export enum TextAnimationType {
  NONE = 'none',
  FADE_IN = 'fade_in',
  FADE_OUT = 'fade_out',
  SLIDE_LEFT = 'slide_left',
  SLIDE_RIGHT = 'slide_right',
  SLIDE_UP = 'slide_up',
  SLIDE_DOWN = 'slide_down',
  ZOOM_IN = 'zoom_in',
  ZOOM_OUT = 'zoom_out',
  TYPEWRITER = 'typewriter'
}

/**
 * Text animation options
 */
export interface TextAnimationOptions {
  type: TextAnimationType;
  duration: number;
  delay?: number;
  easing?: string;
}

/**
 * Text overlay options
 */
export interface TextOverlayOptions {
  text: string;
  position?: OverlayPosition | { x: number; y: number };
  font?: FontOptions;
  startTime?: number;
  duration?: number;
  animation?: TextAnimationOptions;
  boxColor?: string;
  boxOpacity?: number;
  boxBorderWidth?: number;
  boxBorderColor?: string;
  boxPadding?: number;
  alignment?: 'left' | 'center' | 'right';
  wrapWidth?: number;
  opacity?: number;
  rotation?: number;
}

/**
 * Default font options
 */
const DEFAULT_FONT_OPTIONS: FontOptions = {
  family: 'Arial',
  size: 24,
  color: 'white',
  borderWidth: 1,
  borderColor: 'black',
  shadowX: 0,
  shadowY: 0,
  shadowColor: 'black',
  lineSpacing: 0,
  letterSpacing: 0,
  bold: false,
  italic: false
};

/**
 * Calculate position for text overlay
 * @param position Position specification
 * @param videoWidth Video width
 * @param videoHeight Video height
 * @param textWidth Estimated text width (if known)
 * @param textHeight Estimated text height (if known)
 * @returns x and y coordinates
 */
export function calculateTextPosition(
  position: OverlayPosition | { x: number; y: number } = OverlayPosition.BOTTOM_CENTER,
  videoWidth: number,
  videoHeight: number,
  textWidth?: number,
  textHeight?: number
): { x: number; y: number } {
  // If position is a custom object with x,y coordinates
  if (typeof position === 'object' && 'x' in position && 'y' in position) {
    return { x: position.x, y: position.y };
  }

  // Default text dimensions if not provided
  const estimatedTextWidth = textWidth || videoWidth * 0.8;
  const estimatedTextHeight = textHeight || 30;

  // Calculate padding
  const padding = Math.min(videoWidth, videoHeight) * 0.03; // 3% of the smaller dimension

  let x: number, y: number;

  // Calculate position based on the OverlayPosition enum
  switch (position) {
    case OverlayPosition.TOP_LEFT:
      x = padding;
      y = padding;
      break;
    case OverlayPosition.TOP_CENTER:
      x = (videoWidth - estimatedTextWidth) / 2;
      y = padding;
      break;
    case OverlayPosition.TOP_RIGHT:
      x = videoWidth - estimatedTextWidth - padding;
      y = padding;
      break;
    case OverlayPosition.MIDDLE_LEFT:
      x = padding;
      y = (videoHeight - estimatedTextHeight) / 2;
      break;
    case OverlayPosition.MIDDLE_CENTER:
      x = (videoWidth - estimatedTextWidth) / 2;
      y = (videoHeight - estimatedTextHeight) / 2;
      break;
    case OverlayPosition.MIDDLE_RIGHT:
      x = videoWidth - estimatedTextWidth - padding;
      y = (videoHeight - estimatedTextHeight) / 2;
      break;
    case OverlayPosition.BOTTOM_LEFT:
      x = padding;
      y = videoHeight - estimatedTextHeight - padding;
      break;
    case OverlayPosition.BOTTOM_CENTER:
      x = (videoWidth - estimatedTextWidth) / 2;
      y = videoHeight - estimatedTextHeight - padding;
      break;
    case OverlayPosition.BOTTOM_RIGHT:
      x = videoWidth - estimatedTextWidth - padding;
      y = videoHeight - estimatedTextHeight - padding;
      break;
    default:
      x = (videoWidth - estimatedTextWidth) / 2;
      y = videoHeight - estimatedTextHeight - padding;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Create a drawtext filter for FFMPEG
 * @param options Text overlay options
 * @param videoWidth Video width
 * @param videoHeight Video height
 * @returns FFMPEG filter string
 */
export function createTextOverlayFilter(
  options: TextOverlayOptions,
  videoWidth: number,
  videoHeight: number
): string {
  const {
    text,
    position = OverlayPosition.BOTTOM_CENTER,
    font = DEFAULT_FONT_OPTIONS,
    startTime = 0,
    duration,
    animation,
    boxColor,
    boxOpacity = 0.5,
    boxBorderWidth = 0,
    boxBorderColor = 'black',
    boxPadding = 5,
    alignment = 'center',
    wrapWidth,
    opacity = 1,
    rotation = 0
  } = options;

  // Calculate position
  const { x, y } = calculateTextPosition(position, videoWidth, videoHeight);

  // Escape special characters in text
  const escapedText = text.replace(/:/g, '\\:').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  // Build font string
  let fontString = font.family || DEFAULT_FONT_OPTIONS.family;
  if (font.bold) fontString += ':bold=1';
  if (font.italic) fontString += ':italic=1';

  // Start building the filter
  let filter = `drawtext=text='${escapedText}'`;
  filter += `:fontfile=${fontString}`;
  filter += `:fontsize=${font.size || DEFAULT_FONT_OPTIONS.size}`;
  filter += `:fontcolor=${font.color || DEFAULT_FONT_OPTIONS.color}`;

  // Add border if specified
  if (font.borderWidth && font.borderWidth > 0) {
    filter += `:borderw=${font.borderWidth}:bordercolor=${font.borderColor || 'black'}`;
  }

  // Add shadow if specified
  if (font.shadowX !== 0 || font.shadowY !== 0) {
    filter += `:shadowx=${font.shadowX}:shadowy=${font.shadowY}:shadowcolor=${font.shadowColor || 'black'}`;
  }

  // Add position
  filter += `:x=${x}:y=${y}`;

  // Add text box if specified
  if (boxColor) {
    filter += `:box=1:boxcolor=${boxColor}@${boxOpacity}:boxborderw=${boxBorderWidth}:boxbordercolor=${boxBorderColor}:boxw=0:boxh=0`;

    if (boxPadding > 0) {
      filter += `:boxw=text_w+${boxPadding*2}:boxh=text_h+${boxPadding*2}:x=${x-boxPadding}:y=${y-boxPadding}`;
    }
  }

  // Add alignment
  switch (alignment) {
    case 'left':
      filter += ':text_align=1';
      break;
    case 'center':
      filter += ':text_align=2';
      break;
    case 'right':
      filter += ':text_align=3';
      break;
  }

  // Add text wrapping if specified
  if (wrapWidth) {
    filter += `:line_spacing=${font.lineSpacing || 0}:text_wrap=${wrapWidth}`;
  }

  // Add letter spacing if specified
  if (font.letterSpacing && font.letterSpacing !== 0) {
    filter += `:letter_spacing=${font.letterSpacing}`;
  }

  // Add opacity
  if (opacity < 1) {
    filter += `:alpha=${opacity}`;
  }

  // Add rotation if specified
  if (rotation !== 0) {
    filter += `:rotation=${rotation}`;
  }

  // Add timing
  filter += `:enable='between(t,${startTime},${duration ? startTime + duration : 'inf'})'`;

  // Add animation if specified
  if (animation) {
    const { type, duration: animDuration, delay = 0 } = animation;

    switch (type) {
      case TextAnimationType.FADE_IN:
        filter += `:alpha='if(lt(t,${startTime + delay}),0,if(lt(t,${startTime + delay + animDuration}),(t-(${startTime + delay}))/${animDuration},1))'`;
        break;
      case TextAnimationType.FADE_OUT:
        const fadeOutStart = duration ? startTime + duration - animDuration : `t-${animDuration}`;
        filter += `:alpha='if(lt(t,${fadeOutStart}),1,if(lt(t,${fadeOutStart}+${animDuration}),1-(t-${fadeOutStart})/${animDuration},0))'`;
        break;
      case TextAnimationType.SLIDE_LEFT:
        filter += `:x='if(lt(t,${startTime + delay}),${videoWidth},if(lt(t,${startTime + delay + animDuration}),${videoWidth}-(t-(${startTime + delay}))/${animDuration}*(${videoWidth}-${x}),${x}))'`;
        break;
      case TextAnimationType.SLIDE_RIGHT:
        filter += `:x='if(lt(t,${startTime + delay}),0-text_w,if(lt(t,${startTime + delay + animDuration}),(t-(${startTime + delay}))/${animDuration}*(${x}+text_w)-text_w,${x}))'`;
        break;
      case TextAnimationType.SLIDE_UP:
        filter += `:y='if(lt(t,${startTime + delay}),${videoHeight},if(lt(t,${startTime + delay + animDuration}),${videoHeight}-(t-(${startTime + delay}))/${animDuration}*(${videoHeight}-${y}),${y}))'`;
        break;
      case TextAnimationType.SLIDE_DOWN:
        filter += `:y='if(lt(t,${startTime + delay}),0-text_h,if(lt(t,${startTime + delay + animDuration}),(t-(${startTime + delay}))/${animDuration}*(${y}+text_h)-text_h,${y}))'`;
        break;
      case TextAnimationType.ZOOM_IN:
        const fontSizeIn = font.size !== undefined ? font.size : DEFAULT_FONT_OPTIONS.size!;
        filter += `:fontsize='if(lt(t,${startTime + delay}),0,if(lt(t,${startTime + delay + animDuration}),(t-(${startTime + delay}))/${animDuration}*${fontSizeIn},${fontSizeIn}))'`;
        break;
      case TextAnimationType.ZOOM_OUT:
        const fontSize = font.size !== undefined ? font.size : DEFAULT_FONT_OPTIONS.size!;
        const maxSize = fontSize * 3;
        filter += `:fontsize='if(lt(t,${startTime + delay}),${maxSize},if(lt(t,${startTime + delay + animDuration}),${maxSize}-(t-(${startTime + delay}))/${animDuration}*(${maxSize}-${fontSize}),${fontSize}))'`;
        break;
      case TextAnimationType.TYPEWRITER:
        // This is a simplified typewriter effect using text substring
        const charDuration = animDuration / escapedText.length;
        filter += `:text='substr(${escapedText},0,min(${escapedText.length},ceil((t-(${startTime + delay}))/${charDuration})))'`;
        break;
    }
  }

  return filter;
}
