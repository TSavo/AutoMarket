import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { GoogleAPIClient } from './GoogleAPIClient';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface GoogleTextToTextConfig {
  apiClient: GoogleAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export interface GoogleTextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
}

export class GoogleTextToTextModel extends TextToTextModel {
  private apiClient: GoogleAPIClient;
  private modelId: string;

  constructor(config: GoogleTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Google Gemini ${config.modelId}`,
      description: config.metadata?.description || `Google Gemini text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'google',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[], options?: GoogleTextToTextOptions): Promise<Text> {
    const startTime = Date.now();
    const inputRole = Array.isArray(input) ? input[0] : input;
    const text = await inputRole.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    const generated = await this.apiClient.generateText(this.modelId, text.content, {
      temperature: options?.temperature,
      maxTokens: options?.maxOutputTokens,
      topP: options?.topP
    });

    const processingTime = Date.now() - startTime;

    return new Text(generated, text.language || 'auto', 1.0, {
      processingTime,
      model: this.modelId,
      provider: 'google',
      generation_prompt: createGenerationPrompt({
        input,
        options,
        modelId: this.modelId,
        modelName: this.modelId,
        provider: 'google',
        transformationType: 'text-to-text',
        processingTime
      })
    }, text.sourceAsset);
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.apiClient.testConnection();
    } catch {
      return false;
    }
  }
}
