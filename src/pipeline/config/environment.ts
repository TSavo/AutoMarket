/**
 * Environment Configuration for Pipeline
 */

export interface PipelineEnvironment {
  creatifyApiId?: string;
  creatifyApiKey?: string;
  ollamaUrl: string;
  defaultModel: string;
  enableAI: boolean;
  enableFileStorage: boolean;
}

export function getPipelineEnvironment(): PipelineEnvironment {
  return {
    creatifyApiId: process.env.CREATIFY_API_ID,
    creatifyApiKey: process.env.CREATIFY_API_KEY,
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    defaultModel: process.env.OLLAMA_MODEL || 'deepseek-r1:7b',
    enableAI: process.env.ENABLE_AI !== 'false',
    enableFileStorage: process.env.ENABLE_FILE_STORAGE !== 'false'
  };
}

export function isCreatifyAvailable(): boolean {
  const config = getPipelineEnvironment();
  return !!(config.creatifyApiId && config.creatifyApiKey);
}
