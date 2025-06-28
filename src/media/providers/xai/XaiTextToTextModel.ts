import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { XaiAPIClient } from './XaiAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../utils/GenerationPromptHelper';

export interface XaiTextToTextConfig {
  apiClient: XaiAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export interface XaiTextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
}

export class XaiTextToTextModel extends TextToTextModel {
  private apiClient: XaiAPIClient;
  private modelId: string;

  constructor(config: XaiTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `xAI ${config.modelId}`,
      description: config.metadata?.description || `xAI text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'xai',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: XaiTextToTextOptions): Promise<Text> {
    const startTime = Date.now();
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
      provider: 'xai',
      generation_prompt: createGenerationPrompt({
        input,
        options,
        modelId: this.modelId,
        modelName: this.modelId,
        provider: 'xai',
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
