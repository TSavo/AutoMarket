import { TextToTextModel, TextToTextOptions } from '../../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../../models/abstracts/Model';
import { Text, TextRole } from '../../../assets/roles';
import { OllamaAPIClient } from './OllamaAPIClient';
import { createGenerationPrompt, extractInputContent } from '../../../utils/GenerationPromptHelper';

export interface OllamaTextToTextConfig {
  apiClient: OllamaAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class OllamaTextToTextModel extends TextToTextModel {
  private apiClient: OllamaAPIClient;
  private modelId: string;

  constructor(config: OllamaTextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Ollama ${config.modelId}`,
      description: config.metadata?.description || `Ollama text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'ollama',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata,
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[] | string | string[], options?: TextToTextOptions): Promise<Text> {
    const start = Date.now();
    
    let textRole: TextRole;
    if (Array.isArray(input)) {
      textRole = typeof input[0] === 'string' ? Text.fromString(input[0]) : input[0];
    } else {
      textRole = typeof input === 'string' ? Text.fromString(input) : input;
    }

    const text = await textRole.asRole(Text);
    
    if (!text.isValid()) {
      throw new Error('Invalid text input');
    }
    const result = await this.apiClient.generateText({ model: this.modelId, prompt: text.content });
    const processingTime = Date.now() - start;
    return Text.fromString(result.response, text.language || 'auto', 1.0, {
      processingTime,
      model: this.modelId,
      provider: 'ollama',
      generation_prompt: createGenerationPrompt({
        input,
        options,
        modelId: this.modelId,
        modelName: this.modelId,
        provider: 'ollama',
        transformationType: 'text-to-text',
        processingTime,
      }),
    }, text.sourceAsset);
  }

  async isAvailable(): Promise<boolean> {
    return this.apiClient.testConnection();
  }
}
