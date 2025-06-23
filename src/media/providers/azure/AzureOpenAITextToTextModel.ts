import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';

export interface AzureOpenAITextToTextConfig {
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class AzureOpenAITextToTextModel extends TextToTextModel {
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
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[], options?: TextToTextOptions): Promise<Text> {
    throw new Error('Azure OpenAI API integration not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
