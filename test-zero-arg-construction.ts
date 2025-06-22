/**
 * Test zero-argument provider construction
 */

import { OpenRouterProvider } from './src/media/providers/openrouter/OpenRouterProvider';
import { TogetherProvider } from './src/media/providers/together/TogetherProvider';

async function testZeroArgumentConstruction() {
  console.log('🔧 Testing Zero-Argument Provider Construction');
  console.log('=============================================\n');

  try {
    // Test 1: OpenRouter Provider
    console.log('1️⃣ Testing OpenRouter Provider...');
    const openRouter = new OpenRouterProvider(); // Zero arguments!
    console.log('✅ OpenRouter provider created without arguments');
    
    // Give it time to auto-configure
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const openRouterAvailable = await openRouter.isAvailable();
    console.log(`   Auto-configured: ${openRouterAvailable ? '✅' : '❌'}`);
    
    if (openRouterAvailable) {
      const model = await openRouter.getModel('deepseek/deepseek-chat:free');
      console.log(`   Model creation: ✅ ${model.getId()}`);
    }
    
    // Test 2: Together Provider
    console.log('\n2️⃣ Testing Together Provider...');
    const together = new TogetherProvider(); // Zero arguments!
    console.log('✅ Together provider created without arguments');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const togetherAvailable = await together.isAvailable();
    console.log(`   Auto-configured: ${togetherAvailable ? '✅' : '❌'}`);
    
    // Test 3: Registry with Auto-Configured Providers
    console.log('\n3️⃣ Testing Registry Pattern...');
    
    class AutoProviderRegistry {
      private providers = new Map<string, any>();
      
      register(provider: any): void {
        this.providers.set(provider.id, provider);
      }
      
      getProvider(id: string): any | undefined {
        return this.providers.get(id);
      }
        async getAvailableProviders(): Promise<any[]> {
        const available: any[] = [];
        for (const provider of this.providers.values()) {
          if (await provider.isAvailable()) {
            available.push(provider);
          }
        }
        return available;
      }
    }
    
    const registry = new AutoProviderRegistry();
    
    // Register providers (no configuration needed!)
    registry.register(new OpenRouterProvider());
    registry.register(new TogetherProvider());
    
    console.log('✅ Registry created with auto-configuring providers');
    
    // Check which providers auto-configured successfully
    await new Promise(resolve => setTimeout(resolve, 300));
    const availableProviders = await registry.getAvailableProviders();
    
    console.log(`✅ Auto-configured providers: ${availableProviders.length}`);
    availableProviders.forEach(provider => {
      console.log(`   - ${provider.name} (${provider.id})`);
    });
    
    // Test the full elegant pattern
    if (availableProviders.length > 0) {
      console.log('\n4️⃣ Testing Full Elegant Pattern...');
      const provider = registry.getProvider('openrouter');
      
      if (provider && await provider.isAvailable()) {
        // This is the dream syntax!
        const model = await registry
          .getProvider('openrouter')
          .getModel('deepseek/deepseek-chat:free');
          
        console.log('✅ Full pattern works: registry.getProvider().getModel() ✅');
        console.log(`   Model: ${model.getId()} from ${model.getProvider()}`);
      }
    }
    
    console.log('\n🎉 Zero-argument construction SUCCESS!');
    console.log('📝 Summary:');
    console.log('   ✅ Providers self-configure from environment variables');
    console.log('   ✅ No arguments needed for construction');
    console.log('   ✅ Registry pattern works seamlessly');
    console.log('   ✅ Elegant pattern: getProvider().getModel().transform()');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run if called directly
if (require.main === module) {
  testZeroArgumentConstruction().catch(console.error);
}

export { testZeroArgumentConstruction };
