# Dynamic Loading Quick Start Guide

Get started with Prizm's new dynamic provider and service loading in 5 minutes!

## 🎯 What is Dynamic Loading?

Dynamic loading allows you to load providers and services from URLs at runtime, similar to Go modules:

```typescript
// Instead of this (static)
const provider = await getProvider('fal-ai');

// You can now do this (dynamic)
const provider = await getProvider('https://github.com/company/custom-provider');
```

## 🚀 Quick Examples

### **Load Provider from GitHub**
```typescript
import { getProvider } from 'prizm';

// Load a custom AI provider from GitHub
const provider = await getProvider('https://github.com/company/advanced-ai-provider');
await provider.configure({ apiKey: 'your-key' });

// Use like any other provider
const model = await provider.getModel('custom-model');
const result = await model.transform(input);
```

### **Load Provider from NPM**
```typescript
// Load a published provider package
const provider = await getProvider('@company/enterprise-ai-provider@2.1.0');
await provider.configure({ 
  apiKey: process.env.ENTERPRISE_API_KEY 
});
```

### **Provider with Dynamic Service**
```typescript
// Provider automatically loads its required service
const provider = await getProvider('ffmpeg-docker');

await provider.configure({
  // Service loaded from GitHub
  serviceUrl: 'https://github.com/company/gpu-accelerated-ffmpeg',
  
  // Service configuration
  serviceConfig: {
    enableGPU: true,
    memory: '8GB',
    maxConcurrent: 4
  },
  
  // Auto-start the service
  autoStartService: true
});

// Provider is now ready with its custom service
const model = await provider.getModel('video-enhance');
const result = await model.transform(videoInput);
```

## 🔧 Environment-Specific Configuration

```typescript
// Different providers/services for different environments
const providerUrl = process.env.NODE_ENV === 'production'
  ? '@company/production-ai-provider@2.0.0'
  : 'github:company/development-provider@main';

const provider = await getProvider(providerUrl);

await provider.configure({
  serviceUrl: process.env.NODE_ENV === 'production'
    ? '@company/production-service@stable'
    : 'github:company/dev-service@latest'
});
```

## 📦 Creating Your Own Provider

### **1. Repository Structure**
```
my-ai-provider/
├── package.json          # Entry point
├── src/index.ts          # Provider implementation
├── prizm.config.json     # Optional metadata
└── README.md
```

### **2. Basic Provider Implementation**
```typescript
// src/index.ts
import { MediaProvider, MediaCapability, ProviderType } from 'prizm';

export default class MyCustomProvider implements MediaProvider {
  readonly id = 'my-custom-provider';
  readonly name = 'My Custom AI Provider';
  readonly type = ProviderType.REMOTE;
  readonly capabilities = [MediaCapability.TEXT_TO_IMAGE];
  readonly models = [
    { id: 'custom-model', name: 'Custom Model', capabilities: [MediaCapability.TEXT_TO_IMAGE] }
  ];

  async configure(config: any): Promise<void> {
    // Configuration logic
  }

  async isAvailable(): Promise<boolean> {
    // Availability check
    return true;
  }

  async getModel(modelId: string): Promise<any> {
    // Return model implementation
  }

  async getHealth(): Promise<any> {
    // Health check
  }

  getModelsForCapability(capability: MediaCapability): any[] {
    // Return models for capability
    return this.models.filter(m => m.capabilities.includes(capability));
  }
}
```

### **3. Package.json**
```json
{
  "name": "@company/my-ai-provider",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "prizm": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### **4. Usage**
```typescript
// Anyone can now use your provider
const provider = await getProvider('@company/my-ai-provider@1.0.0');
const result = await provider.getModel('custom-model').transform(input);
```

## 🐳 Creating Your Own Service

### **1. Service Structure**
```
my-docker-service/
├── package.json
├── docker-compose.yml    # Service definition
├── src/index.ts          # Service implementation
└── Dockerfile           # Optional custom image
```

### **2. Basic Service Implementation**
```typescript
// src/index.ts
import { DockerService } from 'prizm';

export default class MyCustomService implements DockerService {
  private dockerService: any;

  constructor(config?: any) {
    // Initialize with Docker Compose configuration
  }

  async startService(): Promise<boolean> {
    // Start the Docker service
  }

  async stopService(): Promise<boolean> {
    // Stop the Docker service
  }

  async getServiceStatus(): Promise<any> {
    // Get service status
  }

  // ... other required methods
}
```

### **3. Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'
services:
  my-service:
    image: my-custom-image:latest
    ports:
      - "8080:8080"
    environment:
      - GPU_ENABLED=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🔍 Troubleshooting

### **Common Issues**

**Provider not found:**
```typescript
// ❌ Wrong
const provider = await getProvider('my-typo-provider');

// ✅ Correct  
const provider = await getProvider('https://github.com/company/my-provider');
```

**Service fails to start:**
```typescript
// Check service logs
const service = await getService('my-service');
const logs = await service.getDockerComposeService().getServiceLogs();
console.log(logs);
```

**TypeScript compilation errors:**
- Ensure your provider/service implements the correct interfaces
- Check that all required methods are implemented
- Verify TypeScript configuration is correct

### **Debugging Dynamic Loading**
```typescript
// Enable debug logging
process.env.DEBUG = 'prizm:*';

// Check what's available
const registry = ProviderRegistry.getInstance();
console.log('Available providers:', registry.getAvailableProviders());

// Check registry stats
console.log('Registry stats:', registry.getStats());
```

## 📚 Next Steps

- **[Full Dynamic Loading Documentation](../architecture/dynamic-loading.md)**
- **[Provider System Architecture](../architecture/provider-system.md)**
- **[Docker Service Management](../architecture/docker-management.md)**
- **[Community Provider Examples](https://github.com/prizm-community/providers)**

## 💡 Tips

1. **Pin versions** in production: `@company/provider@2.1.0`
2. **Use environment variables** for different configurations
3. **Test locally** with `file://` URLs before publishing
4. **Document your providers** with clear README files
5. **Use semantic versioning** for your packages
