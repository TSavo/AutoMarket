/**
 * Provider Factory
 * 
 * Creates and configures all available media providers
 */

import { ProviderRegistry } from '@automarket/core';
import { ReplicateAdapter } from './adapters/ReplicateAdapter';
import { FalAiAdapter } from './adapters/FalAiAdapter';
import { CreatifyAdapter } from './remote/CreatifyProvider';
import { ChatterboxProvider } from './local/ChatterboxProvider';

export interface ProviderFactoryConfig {
  replicate?: {
    apiKey: string;
  };
  falAi?: {
    apiKey: string;
  };
  creatify?: {
    apiKey: string;
  };
  chatterbox?: {
    dockerImage?: string;
    baseUrl?: string;
  };
}

export class ProviderFactory {
  private registry: ProviderRegistry;

  constructor(registry: ProviderRegistry) {
    this.registry = registry;
  }

  /**
   * Initialize and register all available providers
   */
  async initializeProviders(config: ProviderFactoryConfig): Promise<void> {
    const providers = [];

    // Initialize Replicate if configured
    if (config.replicate?.apiKey) {
      const replicate = new ReplicateAdapter();
      await replicate.configure({
        apiKey: config.replicate.apiKey
      });
      providers.push(replicate);
    }

    // Initialize FAL.ai if configured
    if (config.falAi?.apiKey) {
      const falAi = new FalAiAdapter();
      await falAi.configure({
        apiKey: config.falAi.apiKey
      });
      providers.push(falAi);
    }

    // Initialize Creatify if configured
    if (config.creatify?.apiKey) {
      const creatify = new CreatifyAdapter();
      await creatify.configure({
        apiKey: config.creatify.apiKey
      });
      providers.push(creatify);
    }

    // Initialize Chatterbox (local provider)
    if (config.chatterbox) {
      const chatterbox = new ChatterboxProvider();
      await chatterbox.configure({
        dockerImage: config.chatterbox.dockerImage,
        baseUrl: config.chatterbox.baseUrl
      });
      providers.push(chatterbox);
    }

    // Register all providers
    for (const provider of providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          this.registry.register(provider);
          console.log(`✅ Registered provider: ${provider.name}`);
        } else {
          console.warn(`⚠️  Provider ${provider.name} is not available, skipping registration`);
        }
      } catch (error) {
        console.error(`❌ Failed to register provider ${provider.name}:`, error);
      }
    }

    // Log summary
    const stats = this.registry.getStats();
    console.log(`\n📊 Provider Registry Summary:`);
    console.log(`   Total providers: ${stats.totalProviders}`);
    console.log(`   Local providers: ${stats.localProviders}`);
    console.log(`   Remote providers: ${stats.remoteProviders}`);
    console.log(`\n🎯 Capability Coverage:`);
    
    Object.entries(stats.capabilityCoverage).forEach(([capability, count]) => {
      if (count > 0) {
        console.log(`   ${capability}: ${count} provider${count > 1 ? 's' : ''}`);
      }
    });
  }

  /**
   * Create a provider factory from environment variables
   */
  static fromEnvironment(registry: ProviderRegistry): ProviderFactory {
    const factory = new ProviderFactory(registry);
    
    // Auto-configure from environment variables
    const config: ProviderFactoryConfig = {};

    if (process.env.REPLICATE_API_TOKEN) {
      config.replicate = {
        apiKey: process.env.REPLICATE_API_TOKEN
      };
    }

    if (process.env.FAL_KEY) {
      config.falAi = {
        apiKey: process.env.FAL_KEY
      };
    }

    if (process.env.CREATIFY_API_KEY) {
      config.creatify = {
        apiKey: process.env.CREATIFY_API_KEY
      };
    }

    // Chatterbox is always available as a local provider
    config.chatterbox = {
      dockerImage: process.env.CHATTERBOX_DOCKER_IMAGE || 'chatterbox-tts:latest',
      baseUrl: process.env.CHATTERBOX_BASE_URL || 'http://localhost:8080'
    };

    // Initialize providers
    factory.initializeProviders(config).catch(error => {
      console.error('Failed to initialize providers:', error);
    });

    return factory;
  }

  /**
   * Get the registry instance
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}

/**
 * Convenience function to create a fully configured provider registry
 */
export async function createProviderRegistry(config?: ProviderFactoryConfig): Promise<ProviderRegistry> {
  // Import the registry implementation
  const { ProviderRegistry: ProviderRegistryImpl } = await import('@automarket/core');
  const registry = new ProviderRegistryImpl();
  
  const factory = new ProviderFactory(registry);
  
  if (config) {
    await factory.initializeProviders(config);
  } else {
    // Use environment-based configuration
    await ProviderFactory.fromEnvironment(registry).initializeProviders({});
  }
  
  return registry;
}

/**
 * Example usage and testing function
 */
export async function demonstrateProviders(): Promise<void> {
  console.log('🚀 Demonstrating AutoMarket Provider System\n');
  
  const registry = await createProviderRegistry();
  
  // Show available providers
  const providers = registry.getProviders();
  console.log(`Found ${providers.length} available providers:\n`);
  
  providers.forEach(provider => {
    console.log(`📦 ${provider.name} (${provider.type})`);
    console.log(`   ID: ${provider.id}`);
    console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
    console.log(`   Models: ${provider.models.length}`);
    console.log('');
  });

  // Demonstrate capability-based provider selection
  const { MediaCapability } = await import('@automarket/core');
  
  console.log('🎯 Capability-based Provider Selection:\n');
  
  const capabilities = [
    MediaCapability.IMAGE_GENERATION,
    MediaCapability.TEXT_TO_SPEECH,
    MediaCapability.VIDEO_ANIMATION,
    MediaCapability.AVATAR_GENERATION
  ];

  for (const capability of capabilities) {
    const availableProviders = registry.getProvidersForCapability(capability);
    console.log(`${capability}:`);
    
    if (availableProviders.length > 0) {
      availableProviders.forEach(provider => {
        const models = provider.getModelsForCapability(capability);
        console.log(`   ✅ ${provider.name} (${models.length} model${models.length > 1 ? 's' : ''})`);
      });
    } else {
      console.log(`   ❌ No providers available`);
    }
    console.log('');
  }

  // Demonstrate intelligent provider selection
  console.log('🧠 Intelligent Provider Selection:\n');
  
  const bestForTTS = await registry.findBestProvider(MediaCapability.TEXT_TO_SPEECH, {
    preferLocal: true
  });
  
  if (bestForTTS) {
    console.log(`Best TTS provider (prefer local): ${bestForTTS.name}`);
  }

  const bestForImage = await registry.findBestProvider(MediaCapability.IMAGE_GENERATION, {
    maxCost: 0.10
  });
  
  if (bestForImage) {
    console.log(`Best image generation provider (max $0.10): ${bestForImage.name}`);
  }
}
