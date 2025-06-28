import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { MistralAPIClient } from './MistralAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface MistralTextToTextConfig {
  apiClient: MistralAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export interface MistralTextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
}

export class MistralTextToTextModel extends TextToTextModel {
  private apiClient: MistralAPIClient;
  private modelId: string;

  constructor(config: MistralTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Mistral ${config.modelId}`,
      description: config.metadata?.description || `Mistral text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'mistral',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: MistralTextToTextOptions): Promise<Text> {
    const startTime = Date.now();
    
    let textRole: TextRole;
    if (Array.isArray(input)) {
      textRole = typeof input[0] === 'string' ? new Text(input[0]) : input[0];
    } else {
      textRole = typeof input === 'string' ? new Text(input) : input;
    }

    const text = await textRole.asText();

    if (!text.isValid()) {
      throw new Error('Invalid text data provided');
    }

    const generated = await this.apiClient.generateText(this.modelId, text.content, {
      temperature: options?.temperature,
      maxTokens: options?.maxOutputTokens,
      topP: options?.topP,
      systemPrompt: options?.systemPrompt
    });

    const processingTime = Date.now() - startTime;

    return new Text(generated, text.language || 'auto', 1.0, {
      processingTime,
      model: this.modelId,
      provider: 'mistral',
      generation_prompt: createGenerationPrompt({
        input,
        options,
        modelId: this.modelId,
        modelName: this.modelId,
        provider: 'mistral',
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
