/**
 * Blog-to-Video Pipeline State Machine Types
 *
 * This file contains the core type definitions for the pipeline state machine,
 * including states, actions, transitions, and context data structures.
 */

/**
 * Enumeration of all possible pipeline states
 */
export enum PipelineState {
  BLOG_SELECTED = 'BLOG_SELECTED',
  SCRIPT_GENERATING = 'SCRIPT_GENERATING',
  SCRIPT_GENERATED = 'SCRIPT_GENERATED',
  SCRIPT_APPROVED = 'SCRIPT_APPROVED',
  AVATAR_GENERATING = 'AVATAR_GENERATING',
  AVATAR_GENERATED = 'AVATAR_GENERATED',
  AUTO_COMPOSING = 'AUTO_COMPOSING',
  AUTO_COMPOSED = 'AUTO_COMPOSED',
  FINAL_APPROVED = 'FINAL_APPROVED',
  READY_FOR_PUBLISHING = 'READY_FOR_PUBLISHING',
  ERROR = 'ERROR'
}

/**
 * Enumeration of all possible pipeline actions
 */
export enum PipelineAction {
  SELECT_BLOG = 'SELECT_BLOG',
  GENERATE_SCRIPT = 'GENERATE_SCRIPT',
  APPROVE_SCRIPT = 'APPROVE_SCRIPT',
  EDIT_SCRIPT = 'EDIT_SCRIPT',
  REGENERATE_SCRIPT = 'REGENERATE_SCRIPT',
  GENERATE_AVATAR = 'GENERATE_AVATAR',
  REGENERATE_AVATAR = 'REGENERATE_AVATAR',
  AUTO_COMPOSE = 'AUTO_COMPOSE',
  REGENERATE_COMPOSITION = 'REGENERATE_COMPOSITION',
  APPROVE_FINAL = 'APPROVE_FINAL',
  RESTART_FROM_STATE = 'RESTART_FROM_STATE',
  HANDLE_ERROR = 'HANDLE_ERROR'
}

/**
 * Matrix of valid state transitions
 * The key is the current state and the value is an array of valid actions from that state
 */
export const VALID_TRANSITIONS: Record<PipelineState, PipelineAction[]> = {
  [PipelineState.BLOG_SELECTED]: [
    PipelineAction.GENERATE_SCRIPT,
    PipelineAction.RESTART_FROM_STATE
  ],
  [PipelineState.SCRIPT_GENERATING]: [
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.SCRIPT_GENERATED]: [
    PipelineAction.APPROVE_SCRIPT,
    PipelineAction.EDIT_SCRIPT,
    PipelineAction.REGENERATE_SCRIPT,
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.SCRIPT_APPROVED]: [
    PipelineAction.GENERATE_AVATAR,
    PipelineAction.EDIT_SCRIPT,
    PipelineAction.RESTART_FROM_STATE
  ],
  [PipelineState.AVATAR_GENERATING]: [
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.AVATAR_GENERATED]: [
    PipelineAction.AUTO_COMPOSE,
    PipelineAction.REGENERATE_AVATAR,
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.AUTO_COMPOSING]: [
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.AUTO_COMPOSED]: [
    PipelineAction.APPROVE_FINAL,
    PipelineAction.REGENERATE_COMPOSITION,
    PipelineAction.RESTART_FROM_STATE,
    PipelineAction.HANDLE_ERROR
  ],
  [PipelineState.FINAL_APPROVED]: [
    PipelineAction.RESTART_FROM_STATE
  ],
  [PipelineState.READY_FOR_PUBLISHING]: [
    PipelineAction.RESTART_FROM_STATE
  ],
  [PipelineState.ERROR]: [
    PipelineAction.RESTART_FROM_STATE
  ]
};

/**
 * Import BlogData from BlogMarkdown - this is our unified blog post type
 */
import { BlogData } from '../lib/markdown/BlogMarkdown';

/**
 * Re-export BlogData as our blog post type for the pipeline
 */
export type BlogPost = BlogData;

/**
 * Import the unified AspectRatio enum from the common module
 */
import { AspectRatio } from '../common/aspect-ratio';

/**
 * Type for a script
 */
export interface Script {
  text: string;
  estimatedDuration: number; // in seconds
  generatedAt: string;
  editedAt?: string;
  regenerated?: boolean;
  approvedAt?: string;
  aspectRatio?: AspectRatio;
}

/**
 * Type for an avatar video
 */
export interface AvatarVideo {
  id: string; // Task ID from Creatify API
  status: 'pending' | 'processing' | 'complete' | 'error';
  url?: string; // URL to the completed video
  error?: string;
  avatarId: string;
  voiceId: string;
  generatedAt: string;
  regenerated?: boolean;
}

/**
 * Type for a composed video (with branding, intro/outro)
 */
export interface ComposedVideo {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  url?: string;
  error?: string;
  generatedAt: string;
  regenerated?: boolean;
}

/**
 * Base pipeline context interface with common properties
 */
export interface BasePipelineContext {
  id: string;
  currentState: PipelineState;
  history: StateHistoryEntry[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
  };
  error?: {
    message: string;
    state: PipelineState;
    action: PipelineAction;
    timestamp: string;
  };
}

/**
 * Blog selected state context
 */
export interface BlogSelectedContext extends BasePipelineContext {
  currentState: PipelineState.BLOG_SELECTED;
  blog: BlogPost;
  script?: undefined;
  avatarVideo?: undefined;
  composedVideo?: undefined;
}

/**
 * Script generating state context
 */
export interface ScriptGeneratingContext extends BasePipelineContext {
  currentState: PipelineState.SCRIPT_GENERATING;
  blog: BlogPost;
  script?: undefined;
  avatarVideo?: undefined;
  composedVideo?: undefined;
}

/**
 * Script generated state context
 */
export interface ScriptGeneratedContext extends BasePipelineContext {
  currentState: PipelineState.SCRIPT_GENERATED;
  blog: BlogPost;
  script: Script;
  avatarVideo?: undefined;
  composedVideo?: undefined;
}

/**
 * Script approved state context
 */
export interface ScriptApprovedContext extends BasePipelineContext {
  currentState: PipelineState.SCRIPT_APPROVED;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo?: undefined;
  composedVideo?: undefined;
}

/**
 * Avatar generating state context
 */
export interface AvatarGeneratingContext extends BasePipelineContext {
  currentState: PipelineState.AVATAR_GENERATING;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo?: AvatarVideo;
  composedVideo?: undefined;
}

/**
 * Avatar generated state context
 */
export interface AvatarGeneratedContext extends BasePipelineContext {
  currentState: PipelineState.AVATAR_GENERATED;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo: AvatarVideo & { status: 'complete' };
  composedVideo?: undefined;
}

/**
 * Auto composing state context
 */
export interface AutoComposingContext extends BasePipelineContext {
  currentState: PipelineState.AUTO_COMPOSING;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo: AvatarVideo & { status: 'complete' };
  composedVideo?: ComposedVideo;
}

/**
 * Auto composed state context
 */
export interface AutoComposedContext extends BasePipelineContext {
  currentState: PipelineState.AUTO_COMPOSED;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo: AvatarVideo & { status: 'complete' };
  composedVideo: ComposedVideo & { status: 'complete' };
}

/**
 * Final approved state context
 */
export interface FinalApprovedContext extends BasePipelineContext {
  currentState: PipelineState.FINAL_APPROVED;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo: AvatarVideo & { status: 'complete' };
  composedVideo: ComposedVideo & { status: 'complete' };
}

/**
 * Ready for publishing state context
 */
export interface ReadyForPublishingContext extends BasePipelineContext {
  currentState: PipelineState.READY_FOR_PUBLISHING;
  blog: BlogPost;
  script: Script & { approvedAt: string };
  avatarVideo: AvatarVideo & { status: 'complete' };
  composedVideo: ComposedVideo & { status: 'complete' };
}

/**
 * Error state context
 */
export interface ErrorContext extends BasePipelineContext {
  currentState: PipelineState.ERROR;
  blog?: BlogPost;
  script?: Script;
  avatarVideo?: AvatarVideo;
  composedVideo?: ComposedVideo;
  error: {
    message: string;
    state: PipelineState;
    action: PipelineAction;
    timestamp: string;
  };
}

/**
 * Pipeline context data
 * Contains all the data and state for a pipeline instance
 * Uses discriminated union based on currentState for type safety
 */
export type PipelineContext =
  | BlogSelectedContext
  | ScriptGeneratingContext
  | ScriptGeneratedContext
  | ScriptApprovedContext
  | AvatarGeneratingContext
  | AvatarGeneratedContext
  | AutoComposingContext
  | AutoComposedContext
  | FinalApprovedContext
  | ReadyForPublishingContext
  | ErrorContext;

/**
 * Type for a state history entry
 */
export interface StateHistoryEntry {
  state: PipelineState;
  action: PipelineAction;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Type for a state transition event
 */
export interface StateTransitionEvent {
  from: PipelineState;
  to: PipelineState;
  action: PipelineAction;
  timestamp: string;
  context: PipelineContext;
}

/**
 * Type for a state transition handler
 */
export interface StateHandler {
  canHandle(state: PipelineState): boolean;
  handleTransition(action: PipelineAction, context: PipelineContext): Promise<PipelineContext>;
}

/**
 * Type for state machine event listeners
 */
export type StateTransitionListener = (event: StateTransitionEvent) => void;

/**
 * Type guard functions for discriminated union state contexts
 */

/**
 * Type guard for BlogSelectedContext
 */
export function isBlogSelectedContext(context: PipelineContext): context is BlogSelectedContext {
  return context.currentState === PipelineState.BLOG_SELECTED;
}

/**
 * Type guard for ScriptGeneratingContext
 */
export function isScriptGeneratingContext(context: PipelineContext): context is ScriptGeneratingContext {
  return context.currentState === PipelineState.SCRIPT_GENERATING;
}

/**
 * Type guard for ScriptGeneratedContext
 */
export function isScriptGeneratedContext(context: PipelineContext): context is ScriptGeneratedContext {
  return context.currentState === PipelineState.SCRIPT_GENERATED;
}

/**
 * Type guard for ScriptApprovedContext
 */
export function isScriptApprovedContext(context: PipelineContext): context is ScriptApprovedContext {
  return context.currentState === PipelineState.SCRIPT_APPROVED;
}

/**
 * Type guard for AvatarGeneratingContext
 */
export function isAvatarGeneratingContext(context: PipelineContext): context is AvatarGeneratingContext {
  return context.currentState === PipelineState.AVATAR_GENERATING;
}

/**
 * Type guard for AvatarGeneratedContext
 */
export function isAvatarGeneratedContext(context: PipelineContext): context is AvatarGeneratedContext {
  return context.currentState === PipelineState.AVATAR_GENERATED;
}

/**
 * Type guard for AutoComposingContext
 */
export function isAutoComposingContext(context: PipelineContext): context is AutoComposingContext {
  return context.currentState === PipelineState.AUTO_COMPOSING;
}

/**
 * Type guard for AutoComposedContext
 */
export function isAutoComposedContext(context: PipelineContext): context is AutoComposedContext {
  return context.currentState === PipelineState.AUTO_COMPOSED;
}

/**
 * Type guard for FinalApprovedContext
 */
export function isFinalApprovedContext(context: PipelineContext): context is FinalApprovedContext {
  return context.currentState === PipelineState.FINAL_APPROVED;
}

/**
 * Type guard for ReadyForPublishingContext
 */
export function isReadyForPublishingContext(context: PipelineContext): context is ReadyForPublishingContext {
  return context.currentState === PipelineState.READY_FOR_PUBLISHING;
}

/**
 * Type guard for ErrorContext
 */
export function isErrorContext(context: PipelineContext): context is ErrorContext {
  return context.currentState === PipelineState.ERROR;
}
