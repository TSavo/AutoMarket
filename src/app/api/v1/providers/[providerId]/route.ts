import { NextRequest, NextResponse } from 'next/server';
import { initializeProviders, ProviderRegistry } from '../../../../../media/registry/bootstrap';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  
  if (!providerId || typeof providerId !== 'string') {
    return NextResponse.json(
      {
        success: false,
        error: 'Provider ID must be a string'
      },
      { status: 400 }
    );
  }

  try {
    // Ensure providers are initialized
    const registry = ProviderRegistry.getInstance();
    if (!registry.getAvailableProviders().length) {
      await initializeProviders();
    }
    
    if (!registry.hasProvider(providerId)) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider '${providerId}' not found`
        },
        { status: 404 }
      );
    }

    const provider = await registry.getProvider(providerId);
    
    const isAvailable = await provider.isAvailable().catch(() => false);
    const health = await provider.getHealth().catch(() => ({
      status: 'unhealthy' as const,
      uptime: 0,
      activeJobs: 0,
      queuedJobs: 0,
      lastError: 'Health check failed'
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        capabilities: provider.capabilities,
        models: provider.models,
        isAvailable,
        health
      }
    });
  } catch (error) {
    console.error(`Error fetching provider ${providerId}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch provider ${providerId}`
      },
      { status: 500 }
    );
  }
}
