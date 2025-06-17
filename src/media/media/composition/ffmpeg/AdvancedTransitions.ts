/**
 * AdvancedTransitions.ts
 * 
 * Provides advanced transition effects for FFMPEG video composition
 */

/**
 * Available transition types
 */
export enum TransitionType {
  FADE = 'fade',
  WIPE_LEFT = 'wipeleft',
  WIPE_RIGHT = 'wiperight',
  WIPE_UP = 'wipeup',
  WIPE_DOWN = 'wipedown',
  SLIDE_LEFT = 'slideleft',
  SLIDE_RIGHT = 'slideright',
  SLIDE_UP = 'slideup',
  SLIDE_DOWN = 'slidedown',
  CIRCULAR = 'circleclose',
  CIRCULAR_OPEN = 'circleopen',
  DISSOLVE = 'dissolve',
  PIXELIZE = 'pixelize',
  RADIAL = 'radial',
  ZOOM_IN = 'zoomin',
  ZOOM_OUT = 'zoomout',
  HBLUR = 'hblur',
  VBLUR = 'vblur',
  FADE_BLACK = 'fadeblack',
  FADE_WHITE = 'fadewhite',
  RANDOM = 'random'
}

/**
 * Interface for transition options
 */
export interface TransitionOptions {
  type: TransitionType;
  duration: number;
  offset?: number;
  color?: string; // For color-based transitions like fadeblack, fadewhite
  customParams?: string; // For any additional custom parameters
}

/**
 * Creates an FFMPEG xfade filter for the specified transition
 * @param options Transition options
 * @returns FFMPEG filter string
 */
export function createTransitionFilter(options: TransitionOptions): string {
  const { type, duration, offset, color, customParams } = options;
  
  // Base filter
  let filter = `xfade=transition=${type}:duration=${duration}`;
  
  // Add offset if specified
  if (offset !== undefined) {
    filter += `:offset=${offset}`;
  }
  
  // Add color if specified and applicable
  if (color && (type === TransitionType.FADE_BLACK || type === TransitionType.FADE_WHITE)) {
    filter += `:c=${color}`;
  }
  
  // Add any custom parameters
  if (customParams) {
    filter += `:${customParams}`;
  }
  
  return filter;
}

/**
 * Creates a random transition filter
 * @param duration Transition duration in seconds
 * @returns FFMPEG filter string with a random transition
 */
export function createRandomTransitionFilter(duration: number): string {
  // Get all transition types except RANDOM
  const transitions = Object.values(TransitionType).filter(t => t !== TransitionType.RANDOM);
  
  // Select a random transition
  const randomType = transitions[Math.floor(Math.random() * transitions.length)];
  
  return createTransitionFilter({
    type: randomType as TransitionType,
    duration
  });
}

/**
 * Creates a sequence of transitions for a multi-clip composition
 * @param clipCount Number of clips in the composition
 * @param transitionDuration Duration of each transition in seconds
 * @param type Transition type (or random)
 * @returns Array of FFMPEG filter strings
 */
export function createTransitionSequence(
  clipCount: number,
  transitionDuration: number,
  type: TransitionType = TransitionType.FADE
): string[] {
  if (clipCount <= 1) {
    return [];
  }
  
  const transitions: string[] = [];
  
  for (let i = 0; i < clipCount - 1; i++) {
    if (type === TransitionType.RANDOM) {
      transitions.push(createRandomTransitionFilter(transitionDuration));
    } else {
      transitions.push(createTransitionFilter({
        type,
        duration: transitionDuration
      }));
    }
  }
  
  return transitions;
}

/**
 * Creates a complex transition filter for picture-in-picture effect
 * @param duration Transition duration in seconds
 * @param startSize Initial size of the PiP (0.0-1.0)
 * @param endSize Final size of the PiP (0.0-1.0)
 * @param xPosition X position (0.0-1.0)
 * @param yPosition Y position (0.0-1.0)
 * @returns FFMPEG filter string
 */
export function createPictureInPictureTransition(
  duration: number,
  startSize: number = 0.3,
  endSize: number = 1.0,
  xPosition: number = 0.8,
  yPosition: number = 0.2
): string {
  return `xfade=transition=custom:duration=${duration}:expr='if(gte(X,W*${xPosition}-W*${startSize}/2)*gte(Y,H*${yPosition}-H*${startSize}/2)*lte(X,W*${xPosition}+W*${startSize}/2)*lte(Y,H*${yPosition}+H*${startSize}/2),A,B)'`;
}

/**
 * Creates a split-screen transition
 * @param duration Transition duration in seconds
 * @param vertical Whether the split is vertical (true) or horizontal (false)
 * @returns FFMPEG filter string
 */
export function createSplitScreenTransition(
  duration: number,
  vertical: boolean = true
): string {
  if (vertical) {
    return `xfade=transition=custom:duration=${duration}:expr='if(lte(X,W/2),A,B)'`;
  } else {
    return `xfade=transition=custom:duration=${duration}:expr='if(lte(Y,H/2),A,B)'`;
  }
}

/**
 * Creates a checkerboard transition
 * @param duration Transition duration in seconds
 * @param size Size of each square in the checkerboard (pixels)
 * @returns FFMPEG filter string
 */
export function createCheckerboardTransition(
  duration: number,
  size: number = 32
): string {
  return `xfade=transition=custom:duration=${duration}:expr='if(eq(mod(floor(X/${size})+floor(Y/${size}),2),0),A,B)'`;
}

/**
 * Creates a transition with a moving line
 * @param duration Transition duration in seconds
 * @param vertical Whether the line moves vertically (true) or horizontally (false)
 * @param reverse Whether to reverse the direction
 * @returns FFMPEG filter string
 */
export function createLineTransition(
  duration: number,
  vertical: boolean = false,
  reverse: boolean = false
): string {
  if (vertical) {
    if (reverse) {
      return `xfade=transition=custom:duration=${duration}:expr='if(gte(Y,H*(1-T)),B,A)'`;
    } else {
      return `xfade=transition=custom:duration=${duration}:expr='if(lte(Y,H*T),B,A)'`;
    }
  } else {
    if (reverse) {
      return `xfade=transition=custom:duration=${duration}:expr='if(gte(X,W*(1-T)),B,A)'`;
    } else {
      return `xfade=transition=custom:duration=${duration}:expr='if(lte(X,W*T),B,A)'`;
    }
  }
}
