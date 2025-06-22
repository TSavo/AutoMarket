import { NextRequest, NextResponse } from 'next/server';
import { initializeProviders, isInitialized } from './src/media/registry/bootstrap';

// Track initialization status
let initializationPromise: Promise<void> | null = null;

export async function middleware(request: NextRequest) {
  // Only initialize providers for API routes
  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    // Ensure providers are initialized exactly once
    if (!isInitialized() && !initializationPromise) {
      console.log('🚀 Initializing providers via middleware...');
      initializationPromise = initializeProviders().catch(error => {
        console.error('Failed to initialize providers:', error);
        initializationPromise = null; // Reset so we can try again
        throw error;
      });
    }
    
    // Wait for initialization to complete
    if (initializationPromise) {
      await initializationPromise;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match API routes that need providers
  matcher: [
    '/api/v1/providers/:path*',
    '/api/v1/transform/:path*',
    '/api/v1/capabilities'
  ]
};
