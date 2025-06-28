import { Creatify } from '@tsavo/creatify-api-ts';

export interface CreatifyConfig {
  apiId: string;
  apiKey: string;
  baseUrl?: string;
}

export class CreatifyClient {
  private client: Creatify;
  constructor(config: CreatifyConfig) {
    const options: any = {
      apiId: config.apiId,
      apiKey: config.apiKey,
    };
    if (config.baseUrl) options.baseUrl = config.baseUrl;
    this.client = new Creatify(options);
  }

  get api() {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.avatar.getAvatars();
      return true;
    } catch {
      return false;
    }
  }
}
