/**
 * KokoroAPIClient
 * 
 * API client for communicating with Kokoro TTS Docker container.
 * Based on ChatterboxAPIClient pattern.
 */

export interface KokoroTTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  alpha?: number;
  beta?: number;
  style?: string;
  language?: string;
}

export interface KokoroTTSResponse {
  audio_url?: string;
  audio_data?: string; // Base64 encoded
  duration?: number;
  sample_rate?: number;
  error?: string;
}

export interface KokoroAPIConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * API client for Kokoro TTS Docker service
 */
export class KokoroAPIClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: KokoroAPIConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8005';
    this.timeout = config.timeout || 300000; // 5 minutes
    this.retries = config.retries || 3;
  }

  /**
   * Configure the API client
   */
  configure(config: KokoroAPIConfig): void {
    if (config.baseUrl) this.baseUrl = config.baseUrl;
    if (config.timeout) this.timeout = config.timeout;
    if (config.retries) this.retries = config.retries;
  }

  /**
   * Check if the API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET',
        timeout: 5000 // Quick health check
      });
      return response.ok;
    } catch {
      return false;
    }
  }  /**
   * Get available voices
   */
  async getVoices(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/v1/voices');
      if (response.ok) {
        const data = await response.json();
        return data.voices || data.data?.map((v: any) => v.id) || this.getDefaultVoices();
      }
      return this.getDefaultVoices();
    } catch {
      return this.getDefaultVoices();
    }
  }

  /**
   * Get default voices (discovered from the API)
   */
  private getDefaultVoices(): string[] {
    return [
      'af_bella', 'af_heart', 'af_sarah', 'af_sky', 'af_nicole', 
      'am_adam', 'am_michael', 'am_eric', 'am_liam',
      'bf_emma', 'bf_lily', 'bm_daniel', 'bm_george'
    ];
  }
  /**
   * Generate TTS audio
   */
  async generateTTS(request: KokoroTTSRequest): Promise<KokoroTTSResponse> {
    try {
      // Convert to OpenAI-compatible format
      const openAIRequest = {
        model: "kokoro",
        input: request.text,
        voice: request.voice || "default",
        response_format: "wav",
        speed: request.speed || 1.0
      };

      const response = await this.makeRequest('/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openAIRequest),
        timeout: this.timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      // Response should be audio data directly
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      return {
        audio_data: audioBase64,
        sample_rate: 24000  // Kokoro default
      };
    } catch (error) {
      console.error('[KokoroAPIClient] TTS generation failed:', error);
      throw error;
    }
  }
  /**
   * Get service info
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await this.makeRequest('/v1/models');
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Make HTTP request with retries
   */
  private async makeRequest(endpoint: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.timeout;
    
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`[KokoroAPIClient] Request failed (attempt ${attempt}/${this.retries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get current configuration
   */
  getConfig(): KokoroAPIConfig {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      retries: this.retries
    };
  }
}
