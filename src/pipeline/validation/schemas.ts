/**
 * Zod validation schemas for API responses
 *
 * This file contains Zod schemas for validating API responses
 * to ensure type safety at runtime.
 */

import { z } from 'zod';
import { PipelineState, PipelineAction } from '../types';

/**
 * Schema for blog post (using BlogData structure)
 */
export const blogPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  date: z.string(),
  author: z.string(),
  images: z.object({
    src: z.string(),
    animated: z.string().optional(),
    altText: z.string()
  }).optional(),
  tags: z.array(z.string()),
  featured: z.boolean(),
  content: z.string(),
  restrictedTo: z.array(z.string()).optional(),
  draft: z.boolean().optional()
});

/**
 * Schema for script
 */
export const scriptSchema = z.object({
  id: z.string(),
  content: z.string(),
  generatedAt: z.string(),
  approvedAt: z.string().optional(),
  regenerated: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for avatar video
 */
export const avatarVideoSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'complete', 'error']),
  url: z.string().optional(),
  error: z.string().optional(),
  avatarId: z.string(),
  voiceId: z.string(),
  generatedAt: z.string(),
  regenerated: z.boolean().optional(),
  taskId: z.string().optional(),
});

/**
 * Schema for composed video
 */
export const composedVideoSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'complete', 'error']),
  url: z.string().optional(),
  error: z.string().optional(),
  generatedAt: z.string(),
  regenerated: z.boolean().optional(),
});

/**
 * Schema for error
 */
export const errorSchema = z.object({
  message: z.string(),
  state: z.nativeEnum(PipelineState),
  action: z.nativeEnum(PipelineAction),
  timestamp: z.string(),
});

/**
 * Schema for state history entry
 */
export const stateHistoryEntrySchema = z.object({
  state: z.nativeEnum(PipelineState),
  action: z.nativeEnum(PipelineAction),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Schema for metadata
 */
export const metadataSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

/**
 * Base pipeline context schema
 */
export const basePipelineContextSchema = z.object({
  id: z.string(),
  currentState: z.nativeEnum(PipelineState),
  history: z.array(stateHistoryEntrySchema),
  metadata: metadataSchema,
  error: errorSchema.optional(),
});

/**
 * Full pipeline context schema
 */
export const pipelineContextSchema = basePipelineContextSchema.extend({
  blog: blogPostSchema.optional(),
  script: scriptSchema.optional(),
  avatarVideo: avatarVideoSchema.optional(),
  composedVideo: composedVideoSchema.optional(),
});

/**
 * Script generation API response schema
 */
export const scriptGenerationResponseSchema = z.object({
  success: z.boolean(),
  script: z.string(),
  error: z.string().optional(),
});

/**
 * Avatar generation API response schema
 */
export const avatarGenerationResponseSchema = z.object({
  success: z.boolean(),
  taskId: z.string().optional(),
  status: z.enum(['pending', 'processing', 'complete', 'error']).optional(),
  url: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Auto composition API response schema
 */
export const autoCompositionResponseSchema = z.object({
  success: z.boolean(),
  videoId: z.string().optional(),
  status: z.enum(['pending', 'processing', 'complete', 'error']).optional(),
  url: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Type definitions from the schemas
 */
export type BlogPost = z.infer<typeof blogPostSchema>;
export type Script = z.infer<typeof scriptSchema>;
export type AvatarVideo = z.infer<typeof avatarVideoSchema>;
export type ComposedVideo = z.infer<typeof composedVideoSchema>;
export type ScriptGenerationResponse = z.infer<typeof scriptGenerationResponseSchema>;
export type AvatarGenerationResponse = z.infer<typeof avatarGenerationResponseSchema>;
export type AutoCompositionResponse = z.infer<typeof autoCompositionResponseSchema>;
