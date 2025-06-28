/**
 * HuggingFaceDockerModel
 * 
 * Text-to-image model implementation that dynamically loads HuggingFace models
 * via Docker service. Supports any diffusers-compatible model from HF Hub.
 */

import { TextToImageModel, TextToImageOptions } from '../../../models/abstracts/TextToImageModel';
import { Image, TextRole, Text } from '../../../assets/roles';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { 
  HuggingFaceAPIClient, 
  HuggingFaceGenerationRequest,
  ModelLoadRequest 
} from './HuggingFaceAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../../utils/GenerationPromptHelper';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HuggingFaceDockerModelConfig {
  apiClient?: HuggingFaceAPIClient;
  modelId: string;
  tempDir?: string;
  autoLoad?: boolean;
  precision?: 'fp16' | 'fp32';
  device?: 'cuda' | 'cpu' | 'auto';
}

export interface HuggingFaceTextToImageOptions extends TextToImageOptions {
  scheduler?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  eta?: number;
  clipSkip?: number;
  [key: string]: any; // Allow model-specific parameters
}

/**
 * HuggingFace Docker-based text-to-image model
 */
export class HuggingFaceDockerModel extends TextToImageModel {
  private apiClient: HuggingFaceAPIClient;
  private modelId: string;
  private tempDir: string;
  private autoLoad: boolean;
  private precision: 'fp16' | 'fp32';
  private device: 'cuda' | 'cpu' | 'auto';
  private isModelLoaded: boolean = false;

  constructor(config: HuggingFaceDockerModelConfig) {
    // Create metadata from model ID
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: `HuggingFace: ${config.modelId}`,
      description: `Dynamic HuggingFace text-to-image model: ${config.modelId}`,
      version: '1.0.0',
      provider: 'huggingface-docker',
      capabilities: ['text-to-image'],
      inputTypes: ['text'],
      outputTypes: ['image']
    };

    super(metadata);

    this.apiClient = config.apiClient || new HuggingFaceAPIClient();
    this.modelId = config.modelId;
    this.tempDir = config.tempDir || path.join(os.tmpdir(), 'huggingface-docker');
    this.autoLoad = config.autoLoad !== false; // Default to true
    this.precision = config.precision || 'fp16';
    this.device = config.device || 'auto';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Transform text to image using HuggingFace model
   */
  async transform(input: TextRole | TextRole[] | string | string[], options?: HuggingFaceTextToImageOptions): Promise<Image> {
    // Handle both array and single input
    const inputRole = Array.isArray(input) ? input[0] : input;
    
    // Handle both TextRole and string inputs
    let text: Text;
    if (typeof inputRole === 'string') {
      text = Text.fromString(inputRole);
    } else {
      text = await inputRole.asText();
    }

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    try {
      // Ensure model is loaded
      await this.ensureModelLoaded();

      // Prepare generation request
      const request: HuggingFaceGenerationRequest = {
        modelId: this.modelId,
        prompt: text.content,
        negativePrompt: options?.negativePrompt,
        width: options?.width || 512,
        height: options?.height || 512,
        numInferenceSteps: options?.numInferenceSteps || options?.steps || 20,
        guidanceScale: options?.guidanceScale || 7.5,
        seed: options?.seed,
        scheduler: options?.scheduler,
        ...options // Include any additional model-specific parameters
      };

      console.log(`[HuggingFaceDockerModel] Generating image with prompt: "${text.content}"`);
      
      // Generate image
      const response = await this.apiClient.generateImage(request);

      if (!response.success) {
        throw new Error(response.error || 'Image generation failed');
      }

      // Handle response - could be URL or base64
      let imageData: Buffer;
      let filename: string;

      if (response.imageBase64) {
        // Decode base64 image
        imageData = Buffer.from(response.imageBase64, 'base64');
        filename = `hf_${this.modelId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      } else if (response.imageUrl) {
        // Download image from URL
        const axios = await import('axios');
        const imageResponse = await axios.default.get(response.imageUrl, { responseType: 'arraybuffer' });
        imageData = Buffer.from(imageResponse.data);
        filename = `hf_${this.modelId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      } else {
        throw new Error('No image data received from service');
      }

      // Save to temp file
      const tempFilePath = path.join(this.tempDir, filename);
      fs.writeFileSync(tempFilePath, imageData);

      console.log(`[HuggingFaceDockerModel] Image saved to: ${tempFilePath}`);

      // Create Image asset
      const image = new Image(imageData, 'png', {
        format: 'png',
        modelId: this.modelId,
        prompt: text.content,
        parameters: request,
        generationTime: response.metadata.generationTime,
        seed: response.metadata.seed,
        filePath: tempFilePath, // Keep track of saved file path
        // Add generation_prompt for lineage tracking
        generation_prompt: createGenerationPrompt({
          input: text, // Raw input object to preserve generation chain
          options: options || {},
          modelId: this.modelId,
          modelName: this.metadata?.name || this.modelId,
          provider: 'huggingface-docker',
          transformationType: 'text-to-image',
          modelMetadata: {
            huggingfaceModelParameters: request,
            generationTime: response.metadata.generationTime,
            seed: response.metadata.seed
          }
        })
      });

      return image;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[HuggingFaceDockerModel] Transform failed:`, message);
      throw new Error(`HuggingFace image generation failed: ${message}`);
    }
  }

  /**
   * Check if the model is available (service is running)
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Ensure the model is loaded in the service
   */
  private async ensureModelLoaded(): Promise<void> {
    if (this.isModelLoaded) {
      return;
    }

    try {
      // Check if model is already loaded
      const modelInfo = await this.apiClient.getModelInfo(this.modelId);
      if (modelInfo.loaded) {
        this.isModelLoaded = true;
        return;
      }
    } catch {
      // Model not loaded, need to load it
    }

    if (this.autoLoad) {
      console.log(`[HuggingFaceDockerModel] Loading model: ${this.modelId}`);
      
      const loadRequest: ModelLoadRequest = {
        modelId: this.modelId,
        precision: this.precision,
        device: this.device,
        force: false
      };

      const loadResponse = await this.apiClient.loadModel(loadRequest);
      
      if (!loadResponse.success) {
        throw new Error(loadResponse.error || `Failed to load model: ${this.modelId}`);
      }

      this.isModelLoaded = true;
      console.log(`[HuggingFaceDockerModel] Model loaded successfully: ${this.modelId} (${loadResponse.loadTime}ms)`);
    } else {
      throw new Error(`Model ${this.modelId} is not loaded and autoLoad is disabled`);
    }
  }

  /**
   * Get model information
   */
  async getModelInfo() {
    try {
      return await this.apiClient.getModelInfo(this.modelId);
    } catch (error) {
      console.warn(`[HuggingFaceDockerModel] Could not get model info for ${this.modelId}:`, error);
      return null;
    }
  }

  /**
   * Unload the model to free memory
   */
  async unloadModel(): Promise<void> {
    if (this.isModelLoaded) {
      try {
        await this.apiClient.unloadModel(this.modelId);
        this.isModelLoaded = false;
        console.log(`[HuggingFaceDockerModel] Model unloaded: ${this.modelId}`);
      } catch (error) {
        console.warn(`[HuggingFaceDockerModel] Failed to unload model ${this.modelId}:`, error);
      }
    }
  }

  /**
   * Get the model ID
   */
  getModelId(): string {
    return this.modelId;
  }
}
