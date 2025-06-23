import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';

export interface MistralTextToTextConfig {
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class MistralTextToTextModel extends TextToTextModel {
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
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[], options?: TextToTextOptions): Promise<Text> {
    throw new Error('Mistral API integration not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
