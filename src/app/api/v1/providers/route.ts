import { NextRequest, NextResponse } from 'next/server';
import ProviderRegistry from './ProviderRegistry';

export async function GET(request: NextRequest) {
  try {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getProviders();
    
    const providersData = await Promise.all(
      providers.map(async (provider) => {
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
