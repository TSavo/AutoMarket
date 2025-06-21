/**
 * ReplicateTextToVideoModel - Implements TextToVideoModel for Replicate text-to-video models
 * 
 * Takes Replicate text-to-video model metadata and uses Replicate API for video generation
 */

import { ModelMetadata } from './Model';
import { TextToVideoModel, TextToVideoOptions } from './TextToVideoModel';
import { Video } from '../assets/roles';
import { ReplicateClient, ReplicateModelMetadata } from '../clients/ReplicateClient';
import { TextInput, castToText } from '../assets/casting';
import Replicate from 'replicate';

export interface ReplicateModelConfig {
  client: ReplicateClient;
  modelMetadata: ReplicateModelMetadata;
  replicateClient: Replicate;
}

/**
 * ReplicateTextToVideoModel - Implements TextToVideoModel for Replicate models like Luma, Runway, etc.
 */
export class ReplicateTextToVideoModel extends TextToVideoModel {
  private client: ReplicateClient;
  private modelMetadata: ReplicateModelMetadata;
  private replicateClient: Replicate;

  constructor(config: ReplicateModelConfig) {
    // Create metadata for TextToVideoModel
    const metadata: ModelMetadata = {
      id: config.modelMetadata.id,
      name: config.modelMetadata.name || config.modelMetadata.id,
      description: config.modelMetadata.description || '',
      version: '1.0.0',
      provider: 'replicate',
      capabilities: ['text-to-video'],
      inputTypes: ['text'],
      outputTypes: ['video']
    };

    super(metadata);

    this.client = config.client;
    this.modelMetadata = config.modelMetadata;
    this.replicateClient = config.replicateClient;
  }

  /**
   * Transform text to video using specific Replicate text-to-video model
   */
  async transform(input: TextInput, options?: TextToVideoOptions): Promise<Video> {
    // Cast input to Text
    const text = await castToText(input);

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Prepare input for this specific Replicate text-to-video model
      const replicateInput = this.prepareReplicateInput(text.content, options);

      console.log(`[ReplicateTextToVideo] Generating video with model: ${this.modelMetadata.id}`);
      console.log(`[ReplicateTextToVideo] Input:`, replicateInput);

      // Create prediction using Replicate API
      const prediction = await this.replicateClient.predictions.create({
        version: this.modelMetadata.id,
        input: replicateInput
      });

      // Wait for completion (simplified - you'd want to poll properly)
      console.log(`[ReplicateTextToVideo] Prediction created: ${prediction.id}`);
      const finalPrediction = await this.replicateClient.predictions.get(prediction.id);

      if (finalPrediction.status === 'succeeded') {
        console.log(`[ReplicateTextToVideo] Video generated:`, finalPrediction.output);
        
        // Create Video from result URL
        const video = this.createVideoFromUrl(
          Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output,
          {
            originalText: text.content,
            modelUsed: this.modelMetadata.id,
            options: options,
            predictionId: prediction.id
          }
        );

        return video;
      } else if (finalPrediction.status === 'failed') {
        throw new Error(String(finalPrediction.error) || 'Video generation failed');
      } else {
        throw new Error(`Video generation in unexpected state: ${finalPrediction.status}`);
      }
    } catch (error) {
      throw new Error(`Replicate text-to-video failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Video object from URL (Replicate result)
   */
  private createVideoFromUrl(url: string, metadata: any = {}): Video {
    // For now, create empty buffer and store URL in metadata
    // TODO: In production, you'd want to download the video
    return new Video(
      Buffer.alloc(0), // Empty buffer for now
      'mp4', // Default format
      {
        format: 'mp4',
        url: url,
        ...metadata
      },
      { url } // Source asset with URL
    );
  }

  /**
   * Prepare input for specific Replicate text-to-video model based on its parameters
   */
  private prepareReplicateInput(text: string, options?: TextToVideoOptions): any {
    const input: any = {
      prompt: text
    };

    // Add model-specific parameters based on the model's parameter schema
    const params = this.modelMetadata.parameters || {};

    // Map common text-to-video options to model parameters
    if (options?.duration && params.duration) {
      input.duration = options.duration;
    }
    if (options?.aspectRatio && params.aspect_ratio) {
      input.aspect_ratio = options.aspectRatio;
    }
    if (options?.fps && params.fps) {
      input.fps = options.fps;
    }
    if (options?.seed && params.seed) {
      input.seed = options.seed;
    }
    if (options?.motionStrength && params.motion_strength) {
      input.motion_strength = options.motionStrength;
    }
    if (options?.loop && params.loop) {
      input.loop = options.loop;
    }
    if (options?.negativePrompt && params.negative_prompt) {
      input.negative_prompt = options.negativePrompt;
    }
    if (options?.guidanceScale && params.guidance_scale) {
      input.guidance_scale = options.guidanceScale;
    }
    if (options?.steps && params.num_inference_steps) {
      input.num_inference_steps = options.steps;
    }

    // Handle different model parameter names
    // Runway Gen-3 uses 'ratio' instead of 'aspect_ratio'
    if (options?.aspectRatio && params.ratio && !params.aspect_ratio) {
      input.ratio = options.aspectRatio;
    }

    // Luma Dream Machine specific parameters
    if (params.motion_bucket_id && options?.motionStrength) {
      input.motion_bucket_id = Math.round(options.motionStrength * 255);
    }

    // Add any default parameters from model metadata
    Object.keys(params).forEach(paramName => {
      const param = params[paramName];
      if (param.default !== undefined && !(paramName in input)) {
        input[paramName] = param.default;
      }
    });

    return input;
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }
}

export default ReplicateTextToVideoModel;
