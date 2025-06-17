/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  images: {
    formats: ['image/avif', 'image/webp'], // Prioritize AVIF first, then WebP
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'horizon-city.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
    unoptimized: false, // Disable Next.js image optimization to avoid sharp issues
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive size presets
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Image size presets
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache for 7 days
    dangerouslyAllowSVG: true, // Allow SVG files (you can set to false if not needed)
  },
  // Enable ISR for all pages with a 1-hour revalidation period
  staticPageGenerationTimeout: 180, // 3 minutes timeout for page generation
  // App Router is enabled by default in Next.js 15+
  experimental: {
    // Add any experimental features here if needed
  },
  serverExternalPackages: ['sharp', 'detect-libc'],

  webpack: (config, { isServer }) => {
    // Handle Node.js modules in client components
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        readline: false,
        crypto: false,
        os: false,
        path: false,
        stream: false,
        events: false,
        sharp: false,
        'detect-libc': false,
      };

      // Handle node: protocol imports
      config.resolve.alias = {
        ...config.resolve.alias,
        'node:child_process': false,
        'node:crypto': false,
        'node:events': false,
        'node:os': false,
        'node:fs': false,
        'node:path': false,
        'node:stream': false,
        'sharp': false,
        'detect-libc': false,
      };
    }

    // Exclude server-only packages from client bundle
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'sharp': 'commonjs sharp',
        'detect-libc': 'commonjs detect-libc',
      });
    }

    return config
  },
  async rewrites() {
    return [
      // Removed sitemap.xml rewrite as we're now using App Router's built-in sitemap generation
      {
        source: '/feed.xml',
        destination: '/api/blog/feed',
      },
      {
        source: '/rss.xml',
        destination: '/api/blog/feed',
      },
      {
        source: '/blog/feed.xml',
        destination: '/api/blog/feed',
      },
      {
        source: '/blog/rss.xml',
        destination: '/api/blog/feed',
      },
      // Removed og-image rewrite as we're no longer using this API route
    ];
  },

  async redirects() {
    return [
      // Redirect characters pages to paydata/characters
      {
        source: '/characters',
        destination: '/paydata/characters',
        permanent: true, // 301 redirect
      },
      {
        source: '/characters/:id',
        destination: '/paydata/characters/:id',
        permanent: true, // 301 redirect
      },

      // Redirect locations pages to paydata/locations
      {
        source: '/locations',
        destination: '/paydata/locations',
        permanent: true, // 301 redirect
      },
      {
        source: '/locations/:id',
        destination: '/paydata/locations/:id',
        permanent: true, // 301 redirect
      },
    ];
  },
  typescript: {
    // Type checking is now enabled for production builds
  },
  eslint: {
    // Linting is now enabled for production builds
    // This will catch code quality issues during the build process
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
