import { Creatify, CreatifyApiOptions } from '@tsavo/creatify-api-ts';

export interface CreatifyConfig {
  apiId: string;
  apiKey: string;
  baseUrl?: string;
}

export class CreatifyClient {
  private client: Creatify;
  constructor(config: CreatifyConfig) {
    const options: CreatifyApiOptions = {
      apiId: config.apiId,
      apiKey: config.apiKey,
    } as CreatifyApiOptions;
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
