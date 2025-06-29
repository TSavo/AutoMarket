# Dynamic Provider & Service Loading Architecture

Prizm's dynamic loading system enables Go-like module loading for providers and services from URLs, creating a decentralized ecosystem for AI/media processing capabilities.

## 🎯 Overview

The dynamic loading system allows:
- **Providers** to be loaded from GitHub repositories, NPM packages, or local files
- **Services** to be loaded dynamically and managed by providers
- **Zero-configuration** setup through URL-based dependency specification
- **Version control** through semantic versioning
- **Community-driven** ecosystem development

## 🏗️ Architecture Components

### **1. Enhanced ProviderRegistry**
- Supports both static and dynamic provider loading
- URL parsing and identifier detection
- Repository cloning and package installation
- Provider validation and caching

### **2. ServiceRegistry**
- Manages Docker service lifecycle
- Supports same dynamic loading patterns as providers
- Service health monitoring and auto-configuration

### **3. Provider → Service Integration**
- Providers can specify service dependencies via `serviceUrl`
- Automatic service loading, starting, and configuration
- Service isolation per provider instance

## 📦 Supported Sources

### **GitHub Repositories**
```typescript
// Load provider from GitHub
const provider = await getProvider('https://github.com/company/ai-provider');
const provider = await getProvider('github:company/ai-provider@v2.1.0');

// Provider loads service from GitHub
await provider.configure({
  serviceUrl: 'github:company/gpu-service@main'
});
```

### **NPM Packages**
```typescript
// Load provider from NPM
const provider = await getProvider('@company/ai-provider@2.1.0');
const provider = await getProvider('npm:package@latest');

// Provider loads service from NPM
await provider.configure({
  serviceUrl: '@company/docker-service@1.5.0'
});
```

### **Local Files**
```typescript
// Load provider from local file
const provider = await getProvider('file:///path/to/provider');

// Provider loads local service
await provider.configure({
  serviceUrl: 'file:///path/to/service'
});
```

### **Static Registry**
```typescript
// Static providers (existing behavior)
const provider = await getProvider('fal-ai');

// Provider uses static service
await provider.configure({
  serviceUrl: 'ffmpeg-docker'
});
```

## 🔄 Dynamic Loading Process

### **Provider Loading Flow**
1. **URL Detection**: Registry detects dynamic identifier patterns
2. **Repository Cloning**: `git clone --depth 1 --branch {ref} {repo}`
3. **Dependency Installation**: `npm install --production` (if package.json exists)
4. **TypeScript Compilation**: `npx tsc --outDir dist` (if tsconfig.json exists)
5. **Entry Point Detection**: package.json main → dist/index.js → src/index.ts
6. **Provider Validation**: Ensures implementation of MediaProvider interface
7. **Instance Creation**: Creates and caches provider instance
8. **Cleanup**: Removes temporary files after successful load

### **Service Loading Flow**
1. **Service Request**: Provider requests service via `serviceUrl` in configure()
2. **ServiceRegistry Lookup**: Uses ServiceRegistry.getService()
3. **Dynamic Loading**: Same cloning/installation process as providers
4. **Service Startup**: Automatically starts Docker services
5. **Health Checking**: Waits for service to become healthy
6. **Auto-Configuration**: Extracts service info (ports, etc.) and configures provider
7. **Lifecycle Management**: Provider manages service throughout its lifetime

## 🛠️ Implementation Details

### **URL Parsing**
```typescript
// GitHub URL parsing
'https://github.com/owner/repo' → { type: 'github', owner: 'owner', repo: 'repo', ref: 'main' }
'github:owner/repo@v1.0.0' → { type: 'github', owner: 'owner', repo: 'repo', ref: 'v1.0.0' }

// NPM package parsing  
'@scope/package@1.2.3' → { type: 'npm', packageName: '@scope/package', version: '1.2.3' }
'npm:package@latest' → { type: 'npm', packageName: 'package', version: 'latest' }

// File path parsing
'file:///path/to/provider' → { type: 'file', path: '/path/to/provider' }
```

### **Provider Repository Structure**
```
my-ai-provider/
├── package.json          # Entry point and dependencies
├── prizm.config.json     # Optional Prizm-specific metadata
├── src/
│   └── index.ts         # Provider implementation
├── dist/
│   └── index.js         # Compiled output
├── tsconfig.json        # TypeScript configuration
└── README.md           # Documentation
```

### **Service Repository Structure**
```
my-docker-service/
├── package.json          # Entry point and dependencies
├── prizm.config.json     # Optional service metadata
├── docker-compose.yml    # Service definition
├── src/
│   └── index.ts         # Service implementation
├── dist/
│   └── index.js         # Compiled output
└── Dockerfile           # Optional custom image
```

## 🔧 Configuration Examples

### **Basic Provider Configuration**
```typescript
// Load provider dynamically
const provider = await getProvider('github:company/ai-provider@v2.1.0');

// Configure with static service
await provider.configure({
  serviceUrl: 'gpu-inference-service',
  apiKey: process.env.API_KEY
});
```

### **Provider with Dynamic Service**
```typescript
// Provider loads its own service dependency
await provider.configure({
  serviceUrl: 'https://github.com/company/specialized-inference-service',
  serviceConfig: {
    modelPath: '/models/custom-model.bin',
    batchSize: 32,
    enableGPU: true
  },
  autoStartService: true
});
```

### **Environment-Specific Configuration**
```typescript
// Different services for different environments
await provider.configure({
  serviceUrl: process.env.NODE_ENV === 'production'
    ? '@company/production-inference-service@2.0.0'
    : 'github:company/development-service@main',
  serviceConfig: {
    logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
  }
});
```

### **Multi-Provider Setup**
```typescript
// Each provider can use different service versions
const providers = await Promise.all([
  getProvider('github:company/fast-ai-provider@v1.0.0'),
  getProvider('github:company/accurate-ai-provider@v2.0.0'),
  getProvider('@company/enterprise-provider@latest')
]);

await Promise.all([
  providers[0].configure({ serviceUrl: '@company/fast-service@1.0.0' }),
  providers[1].configure({ serviceUrl: '@company/accurate-service@2.0.0' }),
  providers[2].configure({ serviceUrl: 'github:company/enterprise-service@stable' })
]);
```

## 🚀 Benefits

### **For Developers**
- **Zero Setup**: Just specify URLs, everything else is automatic
- **Version Control**: Pin exact versions for reproducible deployments
- **Isolation**: Different providers can use different service versions
- **Development Speed**: Rapid prototyping with community providers/services

### **For Organizations**
- **Customization**: Use private repositories for proprietary providers/services
- **Environment Management**: Different configurations for dev/staging/prod
- **Compliance**: Control exactly which versions are used in production
- **Cost Optimization**: Use specialized services for specific workloads

### **For Ecosystem**
- **Decentralized Development**: Community can create and share providers/services
- **Innovation**: Rapid iteration without core platform changes
- **Specialization**: Domain-specific providers/services for niche use cases
- **Composability**: Mix and match providers/services as needed

## 🔒 Security Considerations

### **Code Validation**
- Provider/service interface validation before execution
- Optional security scanning of downloaded code
- Sandboxed execution environments for untrusted sources

### **Source Verification**
- Digital signatures for verified providers/services
- Allowlist/blocklist for approved sources
- Audit logging of dynamic loads

### **Network Security**
- HTTPS-only downloads
- Proxy support for corporate environments
- Offline mode with pre-downloaded dependencies

## 📊 Performance Optimizations

### **Caching Strategy**
- Provider/service instances cached after first load
- Repository caching to avoid re-downloading
- Compiled artifact caching

### **Lazy Loading**
- Providers/services loaded only when needed
- Background preloading for known dependencies
- Parallel loading of multiple dependencies

### **Resource Management**
- Automatic cleanup of temporary files
- Memory management for cached instances
- Service lifecycle optimization

## 🎯 Future Enhancements

### **Package Management**
- Dependency resolution for provider/service chains
- Conflict detection and resolution
- Automatic updates and security patches

### **Distribution**
- Private registry support
- CDN-based distribution for faster downloads
- Package signing and verification

### **Development Tools**
- Scaffolding tools for creating providers/services
- Local development server for testing
- CI/CD integration for automated publishing

### **Enterprise Features**
- Role-based access control for private providers/services
- Usage analytics and cost tracking
- SLA monitoring and alerting

## 📚 Related Documentation

- [Provider Registry Architecture](./provider-registry.md)
- [Docker Service Management](./docker-management.md)
- [Provider System Overview](./provider-system.md)
- [Service Bootstrap Guide](../services/service-bootstrap.md)
