# Model Discovery Deep Dive

While the `ProviderRegistry` manages the availability of `MediaProvider` instances, each individual `MediaProvider` is responsible for discovering and managing the specific AI models it offers. This dynamic model discovery ensures that Prizm always has access to the latest models from integrated AI services.

## Dynamic Model Discovery within Providers

Many `MediaProvider` implementations include internal mechanisms to fetch and cache the models available through their respective APIs. This typically involves:

1.  **Internal `discoveredModels` Map:** A `Map<string, ProviderModel>` is commonly used within the provider class to store the models once they are discovered.
2.  **`discoverModels()` Method:** An asynchronous method responsible for making API calls to the external AI service, parsing the response, and populating the `discoveredModels` map.
3.  **Caching and Fallbacks:** Discovered models are often cached to improve performance on subsequent requests. Providers also implement fallback mechanisms (e.g., using a static list of popular models) if dynamic discovery fails due to network issues or API errors.

### Example: `OpenAIProvider` Model Discovery

The `OpenAIProvider` demonstrates a typical model discovery pattern:

```typescript
// src/media/providers/openai/OpenAIProvider.ts
export class OpenAIProvider implements MediaProvider {
  // ... other properties
  private discoveredModels = new Map<string, ProviderModel>();
  private discoveryPromise: Promise<void> | null = null;

  public async getModels(): Promise<ProviderModel[]> {
    await this.ensureModelsDiscovered();
    return Array.from(this.discoveredModels.values());
  }

  private async ensureModelsDiscovered(): Promise<void> {
    if (this.discoveredModels.size > 0 && !this.discoveryPromise) {
      // Models already discovered and no ongoing discovery
      return;
    }
    if (this.discoveryPromise) {
      // Wait for ongoing discovery to complete
      return this.discoveryPromise;
    }

    this.discoveryPromise = this.discoverModels().finally(() => {
      this.discoveryPromise = null; // Clear the promise once done
    });
    return this.discoveryPromise;
  }

  private async discoverModels(): Promise<void> {
    try {
      console.log('[OpenAIProvider] Discovering models from OpenAI API...');
      const response = await this.client.models.list();
      for (const model of response.data) {
        // Logic to map OpenAI model to Prizm's ProviderModel
        const providerModel = this.mapOpenAIModelToProviderModel(model);
        if (providerModel) {
          this.discoveredModels.set(model.id, providerModel);
        }
      }
      console.log(`[OpenAIProvider] Discovered ${this.discoveredModels.size} models`);
    } catch (error: any) {
      console.warn('[OpenAIProvider] Model discovery failed, using fallback models:', error.message);
      this.addFallbackModels(); // Add a predefined set of models if discovery fails
    }
  }

  // ... other methods
}
```

## Hybrid Model Discovery

Some providers, like `FalAiProvider` and `ReplicateProvider`, implement a more advanced "hybrid model discovery" approach. This can involve:

*   **Direct API Calls:** Fetching model lists directly from the provider's API.
*   **Caching:** Storing discovered metadata locally to reduce API calls and improve load times.
*   **AI Categorization/Scraping:** In some cases, models might be discovered or enriched by scraping web interfaces or using other AI models to categorize their capabilities, especially for providers with less structured API responses.

### Example: `FalAiClient` Model Discovery

`FalAiClient` (used by `FalAiProvider`) demonstrates a complex discovery process that can involve fetching models and then enriching their metadata:

```typescript
// src/media/providers/falai/FalAiClient.ts
export class FalAiClient {
  // ... properties
  private modelCache: Map<string, FalModelMetadata> | null = null;

  public async discoverModels(config?: ModelDiscoveryConfig): Promise<FalModelMetadata[]> {
    // ... logic to fetch models from fal.ai API
    // ... logic to potentially use OpenRouter API for additional metadata
    // ... logic to process and cache discovered models

    // Example snippet from discoverModels:
    const response = await axios.get<FalModelMetadata[]>(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Title': 'Prizm fal.ai Model Discovery'
      },
      timeout: 60000 // 60 seconds timeout
    });
    const discoveredModels = response.data;
    this.modelCache = new Map(discoveredModels.map(model => [model.id, model]));
    return discoveredModels;
  }

  // ... other methods including discoverModelMetadata for detailed info
}
```

## `ProviderModel` Interface

Regardless of the discovery mechanism, all discovered models are mapped to the internal `ProviderModel` interface, ensuring a consistent representation across Prizm.

```typescript
// src/media/types/provider.ts
export interface ProviderModel {
  id: string; // Unique identifier for the model
  name: string; // Human-readable name
  providerId: string; // ID of the provider this model belongs to
  capabilities: MediaCapability[]; // Capabilities supported by this model (e.g., TEXT_TO_IMAGE, TEXT_TO_VIDEO)
  inputFormats?: string[]; // Supported input file formats
  outputFormats?: string[]; // Supported output file formats
  isFree?: boolean; // Indicates if the model is free to use
  // ... other metadata like description, pricing, etc.
}
```

This robust model discovery system allows Prizm to dynamically adapt to changes in AI provider offerings and ensures that the SDK can always leverage the most current and relevant models.