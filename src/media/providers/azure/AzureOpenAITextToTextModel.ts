import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';
import { AzureOpenAIAPIClient } from './AzureOpenAIAPIClient';
import { createGenerationPrompt } from '../../utils/GenerationPromptHelper';

export interface AzureOpenAITextToTextConfig {
  apiClient: AzureOpenAIAPIClient;
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export interface AzureOpenAITextToTextOptions extends TextToTextOptions {
  systemPrompt?: string;
}

export class AzureOpenAITextToTextModel extends TextToTextModel {
  private apiClient: AzureOpenAIAPIClient;
  private modelId: string;

  constructor(config: AzureOpenAITextToTextConfig) {
    const metadata: ModelMetadata = {
      id: config.modelId,
      name: config.metadata?.name || `Azure OpenAI ${config.modelId}`,
      description: config.metadata?.description || `Azure OpenAI text model: ${config.modelId}`,
      version: config.metadata?.version || '1.0.0',
      provider: 'azure-openai',
      capabilities: ['text-generation'],
      inputTypes: ['text'],
      outputTypes: ['text'],
      ...config.metadata
    };
    super(metadata);
    this.apiClient = config.apiClient;
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[], options?: AzureOpenAITextToTextOptions): Promise<Text> {
    const startTime = Date.now();
    const inputRole = Array.isArray(input) ? input[0] : input;
    const text = await inputRole.asText();

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
      provider: 'azure-openai',
      generation_prompt: createGenerationPrompt({
        input,
        options,
        modelId: this.modelId,
        modelName: this.modelId,
        provider: 'azure-openai',
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
