import { NextRequest, NextResponse } from 'next/server';
import { initializeProviders, ProviderRegistry } from '../../../../media/registry/bootstrap';

export async function GET(request: NextRequest) {
  try {
    // Ensure providers are initialized
    if (!ProviderRegistry.getInstance().getAvailableProviders().length) {
      await initializeProviders();
    }
    
    const registry = ProviderRegistry.getInstance();
    const providerIds = registry.getAvailableProviders();
     const providers = await Promise.all(
      providerIds.map(async (id) => {
        try {
          return await registry.getProvider(id);
        } catch (error) {
          console.warn(`Failed to get provider ${id}:`, error);
          return null;
        }
      })
    );
    
    const validProviders = providers.filter((provider): provider is NonNullable<typeof provider> => provider !== null);
    
    const providersData = await Promise.all(
      validProviders.map(async (provider) => {
        const isAvailable = await provider.isAvailable().catch(() => false);
        const health = await provider.getHealth().catch(() => ({
          status: 'unhealthy' as const,
          uptime: 0,
          activeJobs: 0,
          queuedJobs: 0,
          lastError: 'Health check failed'
        }));

        return {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          capabilities: provider.capabilities,
          modelCount: provider.models.length,
          isAvailable,
          health
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        providers: providersData,
        total: providersData.length
      }
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch providers'
      },
      { status: 500 }
    );
  }
}
