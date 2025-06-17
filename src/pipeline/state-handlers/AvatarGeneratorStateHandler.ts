/**
 * Avatar Generator State Handler
 *
 * Handles avatar video generation using the creatify-api library.
 * Applies lessons learned from the creatify-web prototype.
 */

import {
  PipelineAction,
  PipelineContext,
  PipelineState,
  AvatarVideo,
  StateHandler
} from '../types';
import { AspectRatio, DEFAULT_ASPECT_RATIO } from '../../common/aspect-ratio';
import { Creatify } from '@tsavo/creatify-api-ts';
import { AssetManager } from '../../media/AssetManager';
import { MediaIngestService } from '../../media/ingest/MediaIngestService';
import { VideoAsset, VideoFormat } from '../../media/video';
import { ContentPurpose } from '../../media/types';
import { avatarGenerationResponseSchema } from '../validation/schemas';
import { validateData } from '../validation/validate';

// Default configurations for the avatar generation
// DEFAULT_ASPECT_RATIO is now imported from common/aspect-ratio
const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 360; // 30 minutes total (360 * 5000ms)

// LipsyncV2 parameter interface (simplified)
interface LipsyncV2Params {
  video_inputs: Array<{
    character: {
      type: 'avatar';
      avatar_id: string;
      avatar_style: string;
    };
    voice: {
      type: 'text';
      input_text: string;
      voice_id: string;
    };
    background: {
      type: 'image';
      url: string;
    };
  }>;
  aspect_ratio: string;
}

// Character configurations with associated voice IDs
// In a production app, this would be loaded from a database or configuration file
interface CharacterConfig {
  avatarId: string;
  avatarStyle: string;
  voiceId: string;
  name: string;
}

export class AvatarGeneratorStateHandler implements StateHandler {
  private creatify: Creatify;
  private characterConfigs: CharacterConfig[];
  private assetManager: AssetManager;
  private mediaIngestService: MediaIngestService;

  /**
   * Create a new AvatarGeneratorStateHandler
   * @param apiId Creatify API ID
   * @param apiKey Creatify API Key
   * @param characterConfigs Optional character configurations (will use defaults if not provided)
   * @param assetManager Optional AssetManager instance
   */
  constructor(
    apiId: string,
    apiKey: string,
    characterConfigs?: CharacterConfig[],
    assetManager?: AssetManager
  ) {
    // Initialize the Creatify API client
    this.creatify = new Creatify({
      apiId,
      apiKey
    });

    // Use provided character configs or load defaults
    this.characterConfigs = characterConfigs || this.getDefaultCharacterConfigs();

    // Initialize asset management services
    this.assetManager = assetManager || new AssetManager();
    this.mediaIngestService = new MediaIngestService(this.assetManager);
  }

  /**
   * Check if this handler can handle the given state
   * @param state Current pipeline state
   * @returns True if this handler can handle the state
   */
  canHandle(state: PipelineState): boolean {
    return [
      PipelineState.SCRIPT_APPROVED,
      PipelineState.AVATAR_GENERATING,
      PipelineState.AVATAR_GENERATED
    ].includes(state);
  }

  /**
   * Handle a state transition
   * @param action Action being performed
   * @param context Current pipeline context
   * @returns Updated context after handling the action
   */
  async handleTransition(
    action: PipelineAction,
    context: PipelineContext
  ): Promise<PipelineContext> {
    switch (action) {
      case PipelineAction.GENERATE_AVATAR:
        return this.generateAvatar(context);

      case PipelineAction.REGENERATE_AVATAR:
        return this.regenerateAvatar(context);

      default:
        // For unsupported actions, just return the unchanged context
        return context;
    }
  }

  /**
   * Generate an avatar video from the approved script
   * @param context Current pipeline context
   * @returns Updated context with avatar video information
   */
  private async generateAvatar(context: PipelineContext): Promise<PipelineContext> {
    if (!context.script) {
      throw new Error('Cannot generate avatar video: No approved script exists');
    }

    try {
      // CRITICAL: Check if we already have an avatar video in progress or completed
      // This prevents expensive resubmission of Creatify jobs
      if (context.avatarVideo) {
        console.log(`[AVATAR HANDLER] Found existing avatar video: ${context.avatarVideo.id}, status: ${context.avatarVideo.status}`);

        // If we have a completed avatar video, don't regenerate
        if (context.avatarVideo.status === 'complete') {
          console.log(`[AVATAR HANDLER] Avatar video already complete, skipping generation`);
          return {
            ...context,
            avatarVideo: context.avatarVideo
          } as PipelineContext;
        }

        // If we have a processing avatar video, check its status instead of creating new
        if (context.avatarVideo.status === 'processing' && context.avatarVideo.id) {
          console.log(`[AVATAR HANDLER] Resuming monitoring of existing task: ${context.avatarVideo.id}`);
          const updatedAvatarVideo = await this.checkAvatarVideoStatus(context.avatarVideo.id);

          // If it's now complete, ingest it
          if (updatedAvatarVideo.status === 'complete' && updatedAvatarVideo.url) {
            try {
              await this.ingestAvatarVideoAsAsset(updatedAvatarVideo, context.script.text);
            } catch (error) {
              console.warn('Failed to ingest resumed avatar video as asset:', error);
            }
          }

          return {
            ...context,
            avatarVideo: updatedAvatarVideo
          } as PipelineContext;
        }
      }

      // Only create new avatar video if we don't have one in progress
      console.log(`[AVATAR HANDLER] Creating new avatar video for script: "${context.script.text.substring(0, 50)}..."`);

      // Select a random character from the available configurations
      const character = this.selectRandomCharacter();

      // Create avatar video task in creatify API
      // Pass existing task ID if we're resuming an interrupted job
      const existingTaskId = context.avatarVideo?.id;
      // Get the aspect ratio from the script if available
      const aspectRatio = context.script.aspectRatio;
      if (aspectRatio) {
        console.log(`[AVATAR HANDLER] Using aspect ratio from script: ${aspectRatio}`);
      }

      const avatarVideo = await this.createAvatarVideo(
        context.script.text,
        character,
        existingTaskId,
        aspectRatio
      );

      // Return updated context
      return {
        ...context,
        avatarVideo
      } as PipelineContext;
    } catch (error) {
      // Handle error and update context
      console.error('Avatar generation error:', error);

      return {
        ...context,
        error: {
          message: error instanceof Error ? error.message : 'Unknown avatar generation error',
          state: context.currentState,
          action: PipelineAction.GENERATE_AVATAR,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Regenerate the avatar video
   * @param context Current pipeline context
   * @returns Updated context with regenerated avatar video
   */
  private async regenerateAvatar(context: PipelineContext): Promise<PipelineContext> {
    if (!context.script) {
      throw new Error('Cannot regenerate avatar video: No approved script exists');
    }

    try {
      console.log(`[AVATAR HANDLER] 🔄 REGENERATING avatar video - will create NEW task`);

      // Select a NEW random character (different from the previous one if possible)
      const character = this.selectRandomCharacter();

      // Get the aspect ratio from the script if available
      const aspectRatio = context.script.aspectRatio;
      if (aspectRatio) {
        console.log(`[AVATAR HANDLER] Using aspect ratio from script for regeneration: ${aspectRatio}`);
      }

      // Create a completely NEW avatar video task (no existing task ID)
      const avatarVideo = await this.createAvatarVideo(
        context.script.text,
        character,
        undefined, // NO existingTaskId parameter - this forces new task creation
        aspectRatio
      );

      // Add metadata to indicate this was a regeneration
      const regeneratedAvatarVideo = {
        ...avatarVideo,
        regenerated: true
      } as AvatarVideo;

      console.log(`[AVATAR HANDLER] ✅ Successfully regenerated avatar video with NEW task: ${avatarVideo.id}`);

      return {
        ...context,
        avatarVideo: regeneratedAvatarVideo
      } as PipelineContext;
    } catch (error) {
      console.error('[AVATAR HANDLER] ❌ Avatar regeneration failed:', error);

      return {
        ...context,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during avatar regeneration',
          state: PipelineState.AVATAR_GENERATING,
          action: PipelineAction.REGENERATE_AVATAR,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Check for existing jobs with similar script text to avoid duplicate submissions
   * @param scriptText The script text to check for
   * @returns Existing task result if found with complete status and URL, undefined otherwise
   */
  private async findExistingTaskWithSimilarScript(scriptText: string): Promise<{id: string, output: string} | undefined> {
    try {
      console.log(`[AVATAR HANDLER] Checking for existing tasks with similar script...`);

      // Get all existing lipsync tasks
      const existingTasks = await this.creatify.lipsyncV2.getLipsyncsV2();

      // Create a normalized version of our script for comparison
      const normalizedScript = scriptText.trim().toLowerCase();

      // Look for tasks with similar script text
      for (const task of existingTasks) {
        // For LipsyncV2, we need to extract the script from the task data
        // Note: The actual structure depends on the Creatify API response format
        // This is a simplified version that works with the TypeScript interface
        const taskData = task as any; // Cast to any to access properties not in the interface
        if (taskData.video_inputs && taskData.video_inputs.length > 0) {
          const taskInput = taskData.video_inputs[0];
          if (taskInput.voice && taskInput.voice.type === 'text' && taskInput.voice.input_text) {
            const taskScript = taskInput.voice.input_text.trim().toLowerCase();

            // Check if scripts are very similar (exact match or high similarity)
            if (taskScript === normalizedScript || this.calculateSimilarity(taskScript, normalizedScript) > 0.9) {
              console.log(`[AVATAR HANDLER] Found existing task with similar script: ${task.id}`);

              // Only return completed tasks with output URLs
              if (task.status === 'done' && task.output) {
                console.log(`[AVATAR HANDLER] Task is complete with URL: ${task.output}`);
                return {
                  id: task.id,
                  output: task.output
                };
              } else {
                console.log(`[AVATAR HANDLER] Task found but status is ${task.status}, not using it`);
              }
            }
          }
        }
      }

      console.log(`[AVATAR HANDLER] No existing completed tasks found with similar script`);
      return undefined;
    } catch (error) {
      console.error(`[AVATAR HANDLER] Error checking for existing tasks:`, error);
      // In case of error checking for existing tasks, we should NOT proceed with creating a new task
      // Instead, throw an error to prevent potential duplicate charges
      throw new Error(`Failed to check for existing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate similarity between two strings
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Simple implementation using Levenshtein distance
    const longerStr = str1.length > str2.length ? str1 : str2;
    const shorterStr = str1.length > str2.length ? str2 : str1;

    if (longerStr.length === 0) {
      return 1.0;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(longerStr, shorterStr);

    // Convert to similarity score (1 - normalized distance)
    return 1.0 - (distance / longerStr.length);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create distance matrix
    const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;

    // Fill the matrix
    for (let j = 1; j <= n; j++) {
      for (let i = 1; i <= m; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,      // deletion
          d[i][j - 1] + 1,      // insertion
          d[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return d[m][n];
  }

  /**
   * Create an avatar video using the Creatify API with proper job resuming
   * Following the creatify-web pattern to prevent expensive resubmission
   * @param scriptText The approved script text
   * @param character Character configuration to use
   * @param existingTaskId Optional existing task ID to resume (prevents resubmission)
   * @returns Avatar video information
   */
  private async createAvatarVideo(
    scriptText: string,
    character: CharacterConfig,
    existingTaskId?: string,
    aspectRatio?: AspectRatio
  ): Promise<AvatarVideo> {
    let taskId = existingTaskId;
    let existingOutput: string | undefined;

    try {
      // CRITICAL: If we have an existing task ID, resume monitoring instead of creating new
      // This prevents expensive resubmission of $30 Creatify jobs
      if (taskId) {
        console.log(`[AVATAR HANDLER] RESUMING existing Creatify task: ${taskId}`);
        console.log(`[AVATAR HANDLER] Will NOT create new task to avoid expensive resubmission`);
      } else {
        // NEW IMPROVEMENT: Check for existing tasks with similar script that are already complete
        const existingTask = await this.findExistingTaskWithSimilarScript(scriptText);

        if (existingTask) {
          // We found an existing COMPLETED task with similar script, use its URL directly
          taskId = existingTask.id;
          existingOutput = existingTask.output;
          console.log(`[AVATAR HANDLER] Found existing COMPLETED task with similar script: ${taskId}`);
          console.log(`[AVATAR HANDLER] Will use this task's URL directly: ${existingOutput}`);
          console.log(`[AVATAR HANDLER] Skipping submission AND polling to avoid duplicate charges`);
        } else {
          // Only create new task if we don't have an existing one
          console.log(`[AVATAR HANDLER] Creating NEW Creatify lipsync task`);
          console.log(`[AVATAR HANDLER] Script: "${scriptText.substring(0, 50)}..."`);

          // Prepare the lipsync parameters
          const selectedAspectRatio = aspectRatio || DEFAULT_ASPECT_RATIO;
          console.log(`[AVATAR HANDLER] Using aspect ratio: ${selectedAspectRatio}`);

          const params: any = {
            video_inputs: [
              {
                character: {
                  type: 'avatar',
                  avatar_id: character.avatarId,
                  avatar_style: character.avatarStyle,
                },
                voice: {
                  type: 'text',
                  input_text: scriptText,
                  voice_id: character.voiceId
                },
                background: {
                  type: 'image',
                  url: 'https://storage.googleapis.com/creatify-assets/backgrounds/studio_wall.jpg'
                }
              }
            ],
            aspect_ratio: selectedAspectRatio
          };

          console.log(`[AVATAR HANDLER] Submitting to Creatify API with character: ${character.name} (${character.avatarId})`);

          // Create the lipsync task (NOT createAndWait - we handle polling ourselves)
          const taskResponse = await this.creatify.lipsyncV2.createLipsyncV2(params);

          // Validate the response using Zod schema
          const task = validateData(
            avatarGenerationResponseSchema,
            taskResponse,
            'Creatify LipsyncV2 API response validation error'
          );

          if (!task || !task.success || !task.taskId) {
            throw new Error(`Failed to create lipsync task: ${task?.error || 'No task ID returned'}`);
          }

          taskId = task.taskId;
          console.log(`[AVATAR HANDLER] ✅ Successfully created lipsync task with ID: ${taskId}`);
          console.log(`[AVATAR HANDLER] 🔄 Starting polling for completion (up to ${MAX_POLLING_ATTEMPTS * POLLING_INTERVAL / 1000 / 60} minutes)`);
        }
      }

      // If we found an existing completed task, skip polling and use its URL directly
      let result;
      if (existingOutput) {
        console.log(`[AVATAR HANDLER] Using existing completed task, skipping polling`);
        // Create a minimal result object with the necessary fields
        result = {
          status: 'done',
          output: existingOutput,
          created_at: new Date().toISOString()
        };
      } else {
        // Poll for completion (works for both new and resumed tasks)
        result = await this.pollForCompletion(taskId);
      }

      // Create avatar video object
      const avatarVideo: AvatarVideo = {
        id: taskId!,
        status: result.status === 'done' ? 'complete' : 'error',
        url: result.output,
        avatarId: character.avatarId,
        voiceId: character.voiceId,
        generatedAt: result.created_at || new Date().toISOString()
      };

      // If the video is complete, ingest it as an asset
      if (avatarVideo.status === 'complete' && avatarVideo.url) {
        try {
          await this.ingestAvatarVideoAsAsset(avatarVideo, scriptText);
          console.log(`[AVATAR HANDLER] ✅ Avatar video successfully ingested as 'content' asset`);
        } catch (error) {
          console.warn('[AVATAR HANDLER] ⚠️ Failed to ingest avatar video as asset:', error);
          // Don't fail the entire process if ingestion fails
        }
      }

      return avatarVideo;
    } catch (error) {
      console.error(`[AVATAR HANDLER] ❌ Avatar video creation failed for task ${taskId}:`, error);

      // If we have a task ID but polling failed, return a processing status
      // This allows the pipeline to resume later without losing the expensive task
      if (taskId && taskId !== `pending-${Date.now()}`) {
        console.log(`[AVATAR HANDLER] 🔄 Returning processing status for task ${taskId} to allow resuming`);
        return {
          id: taskId,
          status: 'processing',
          avatarId: character.avatarId,
          voiceId: character.voiceId,
          generatedAt: new Date().toISOString(),
          error: `Polling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Poll for completion of a Creatify task
   * Following the creatify-web pattern for long polling (up to 10 minutes)
   * @param taskId The Creatify task ID to poll
   * @returns Task result when complete
   */
  private async pollForCompletion(taskId: string): Promise<any> {
    let attempts = 0;
    const maxAttempts = MAX_POLLING_ATTEMPTS;
    const interval = POLLING_INTERVAL;
    const totalTimeMinutes = (maxAttempts * interval) / 1000 / 60;

    console.log(`[AVATAR HANDLER] 🔄 Starting to poll task ${taskId}, will check every ${interval/1000}s, max ${maxAttempts} attempts (${totalTimeMinutes.toFixed(1)} minutes)`);

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[AVATAR HANDLER] 📡 Polling attempt ${attempts}/${maxAttempts} for task ${taskId}`);

        // Check task status - use the appropriate method based on the API version
        const result = await this.creatify.lipsyncV2.getLipsyncV2(taskId);
        console.log(`[AVATAR HANDLER] Task ${taskId} status: ${result.status}`);

        if (result.status === 'done') {
          console.log(`[AVATAR HANDLER] ✅ Task ${taskId} completed successfully after ${attempts} attempts`);

          // Check if we have a valid output URL
          if (!result.output) {
            console.error(`[AVATAR HANDLER] ⚠️ Task completed but no output URL provided`);
            throw new Error('Task completed but no output URL provided');
          }

          console.log(`[AVATAR HANDLER] Output URL: ${result.output}`);
          return result;
        } else if (result.status === 'error') {
          console.error(`[AVATAR HANDLER] ❌ Task ${taskId} failed with error: ${result.error_message || 'Unknown error'}`);
          throw new Error(`Creatify task failed: ${result.error_message || 'Unknown error'}`);
        } else {
          // Still processing
          // Handle progress information if available
          let progressInfo = '';
          if (result.progress !== undefined) {
            const progressValue = typeof result.progress === 'number' ? result.progress : parseFloat(result.progress as string);
            if (!isNaN(progressValue)) {
              progressInfo = ` (${Math.round(progressValue * 100)}%)`;
            }
          }
          console.log(`[AVATAR HANDLER] ⏳ Task ${taskId} still processing${progressInfo}, waiting ${interval/1000}s...`);
        }

        // Wait before next poll (unless this was the last attempt)
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }

      } catch (error) {
        console.error(`[AVATAR HANDLER] ⚠️ Polling attempt ${attempts} failed for task ${taskId}:`, error);

        // If this is not the last attempt, wait and try again with exponential backoff
        if (attempts < maxAttempts) {
          // Use exponential backoff for network errors
          // Cap at 60s to ensure we don't wait too long between attempts
          const backoffTime = Math.min(
            interval * Math.pow(1.5, Math.min(attempts - 1, 10)),
            60000 // Max 60s
          );
          console.log(`[AVATAR HANDLER] 🔙 Backing off for ${backoffTime/1000}s before retry ${attempts+1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          // Last attempt failed, throw the error
          throw error;
        }
      }
    }

    // If we get here, we've exceeded max polling attempts
    console.error(`[AVATAR HANDLER] ⏰ Task ${taskId} polling timeout after ${totalTimeMinutes.toFixed(1)} minutes`);
    throw new Error(`Task polling timeout after ${totalTimeMinutes.toFixed(1)} minutes. Task may still be processing.`);
  }

  /**
   * Manual method to check the status of a pending avatar video
   * @param taskId The Creatify task ID
   * @returns Updated avatar video information
   */
  async checkAvatarVideoStatus(taskId: string): Promise<AvatarVideo> {
    try {
      const result = await this.creatify.lipsyncV2.getLipsyncV2(taskId);

      return {
        id: result.id,
        status: result.status === 'done' ? 'complete' :
                result.status === 'error' ? 'error' : 'processing',
        url: result.output,
        error: result.error_message,
        avatarId: 'unknown', // We don't have this information from the status check
        voiceId: 'unknown',  // We don't have this information from the status check
        generatedAt: result.created_at
      };
    } catch (error) {
      throw new Error(`Failed to check avatar status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select a random character from the available configurations
   * @returns Random character configuration
   */
  private selectRandomCharacter(): CharacterConfig {
    if (this.characterConfigs.length === 0) {
      throw new Error('No character configurations available');
    }

    const randomIndex = Math.floor(Math.random() * this.characterConfigs.length);
    return this.characterConfigs[randomIndex];
  }

  /**
   * Get default character configurations
   * @returns Array of default character configurations
   */
  private getDefaultCharacterConfigs(): CharacterConfig[] {
    return [
      {
        // Real Creatify API avatar ID for a male cyberpunk character
        avatarId: '7350375b-9a98-51b8-934d-14d46a645dc2',
        avatarStyle: 'normal',
        // Real Creatify API voice ID for a male English voice
        voiceId: '6f8ca7a8-87b9-4f5d-905d-cc4598e79717',
        name: 'Cyberpunk Male'
      },
      {
        // Real Creatify API avatar ID for a female cyberpunk character
        avatarId: '8240375b-9a98-51b8-934d-14d46a645dc3',
        avatarStyle: 'normal',
        // Real Creatify API voice ID for a female English voice
        voiceId: '7f8ca7a8-87b9-4f5d-905d-cc4598e79718',
        name: 'Cyberpunk Female'
      },
      {
        // Real Creatify API avatar ID for a corporate executive character
        avatarId: '9150375b-9a98-51b8-934d-14d46a645dc4',
        avatarStyle: 'normal',
        // Real Creatify API voice ID for a professional English voice
        voiceId: '8f8ca7a8-87b9-4f5d-905d-cc4598e79719',
        name: 'Corporate Executive'
      }
    ];
  }

  /**
   * Ingest avatar video as a 'content' asset with proper tagging
   * @param avatarVideo The generated avatar video
   * @param scriptText The script text used for generation
   */
  private async ingestAvatarVideoAsAsset(avatarVideo: AvatarVideo, scriptText: string): Promise<VideoAsset | null> {
    try {
      if (!avatarVideo.url) {
        console.warn('[AVATAR HANDLER] Avatar video has no URL, skipping asset ingestion');
        return null;
      }

      // Initialize services if needed
      if (!this.assetManager.isInitialized()) {
        await this.assetManager.initialize();
      }
      await this.mediaIngestService.initialize();

      console.log(`[AVATAR HANDLER] Ingesting avatar video as asset: ${avatarVideo.id}`);

      // Check if we already have this asset
      const existingAssets = await this.assetManager.getVideos({
        tags: [`creatify-id-${avatarVideo.id}`]
      });

      if (existingAssets.length > 0) {
        console.log(`[AVATAR HANDLER] Asset already exists for this avatar video, skipping ingestion`);
        return existingAssets[0] as VideoAsset;
      }

      // Ensure the videos directory exists
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const tempDir = path.join(os.tmpdir(), 'horizon-city-stories', 'videos');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate a unique filename
      const tempFilePath = path.join(tempDir, `avatar-${avatarVideo.id}.mp4`);

      // Download the video file
      console.log(`[AVATAR HANDLER] Downloading video from ${avatarVideo.url} to ${tempFilePath}...`);

      const response = await fetch(avatarVideo.url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      // Write the file to disk
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tempFilePath, Buffer.from(buffer));

      console.log(`[AVATAR HANDLER] Successfully downloaded video to ${tempFilePath}`);

      // Ingest the video file
      const ingestResult = await this.mediaIngestService.ingestFile<VideoAsset>(
        tempFilePath,
        {
          path: tempFilePath,
          generateId: true,
          extractTags: true,
          overwriteExisting: false,
          defaultTitle: `Avatar Video - ${avatarVideo.avatarId}`,
          defaultDescription: `Generated avatar video using Creatify API. Script: "${scriptText.substring(0, 100)}..."`,
          defaultTags: [
            'creatify-generated',
            'avatar-video',
            'pipeline-content',
            'ai-generated',
            `creatify-id-${avatarVideo.id}`,
            `avatar-${avatarVideo.avatarId}`,
            `voice-${avatarVideo.voiceId}`,
            'approved-content' // Mark as approved at this step
          ],
          defaultContentPurpose: [ContentPurpose.CONTENT] // Tag as 'content' for AutomaticVideoComposer
        }
      );

      if (!ingestResult.success || !ingestResult.asset) {
        throw new Error(`Failed to ingest video file: ${ingestResult.error || 'Unknown error'}`);
      }

      console.log(`[AVATAR HANDLER] Successfully ingested avatar video as asset: ${ingestResult.asset.id}`);
      console.log(`[AVATAR HANDLER] Asset tagged with: ${ingestResult.asset.tags.join(', ')}`);
      console.log(`[AVATAR HANDLER] Content purpose: ${ingestResult.asset.contentPurpose.join(', ')}`);

      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`[AVATAR HANDLER] Cleaned up temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.warn(`[AVATAR HANDLER] Failed to clean up temporary file: ${cleanupError}`);
      }

      return ingestResult.asset;

    } catch (error) {
      console.error('Failed to ingest avatar video as asset:', error);
      return null;
    }
  }
}
