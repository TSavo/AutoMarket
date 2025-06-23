import { TextToTextModel, TextToTextOptions } from '../../models/abstracts/TextToTextModel';
import { ModelMetadata } from '../../models/abstracts/Model';
import { Text, TextRole } from '../../assets/roles';

export interface GoogleTextToTextConfig {
  modelId: string;
  metadata?: Partial<ModelMetadata>;
}

export class GoogleTextToTextModel extends TextToTextModel {
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
    this.modelId = config.modelId;
  }

  async transform(input: TextRole | TextRole[], options?: TextToTextOptions): Promise<Text> {
    throw new Error('Google Gemini API integration not implemented');
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
