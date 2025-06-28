# Provider Capabilities

This directory contains **provider capability interfaces** that define what functionality providers can offer within the Prizm SDK architecture. This is distinct from **asset roles** which define what data types assets can provide.

## Key Distinction

### Provider Capabilities (this directory)
- **Purpose**: Define what providers can DO
- **Examples**: `TextToImageProvider`, `AudioToTextProvider`, `TextToAudioProvider`
- **Usage**: `class ReplicateProvider implements TextToImageProvider`

### Asset Roles (`../assets/roles/`)
- **Purpose**: Define what data types assets can provide
- **Examples**: `AudioRole`, `VideoRole`, `TextRole`
- **Usage**: `class MP4Asset implements VideoRole, AudioRole`

## Directory Structure

```
capabilities/
├── interfaces/              # Provider capability interfaces
│   ├── AudioToTextProvider.ts
│   ├── TextToAudioProvider.ts
│   ├── TextToImageProvider.ts
│   ├── TextToVideoProvider.ts
│   ├── TextToTextProvider.ts
│   ├── VideoToAudioProvider.ts
│   └── VideoToVideoProvider.ts
├── mixins/                  # Provider capability mixins
│   ├── AudioToTextMixin.ts
│   ├── TextToAudioMixin.ts
│   └── ...
├── guards/                  # Type guards for capabilities
│   └── ProviderRoleGuards.ts
├── ServiceManagement.ts     # Base service management interface
└── index.ts                 # Main exports
```

## Usage Examples

### Implementing a Provider
```typescript
import { TextToImageProvider, ServiceManagement } from '../capabilities';

class MyProvider implements TextToImageProvider {
  async createTextToImageModel(modelId: string): Promise<TextToImageModel> {
    // Implementation
  }
  
  getSupportedTextToImageModels(): string[] {
    // Implementation
  }
  
  // ServiceManagement methods
  async startService(): Promise<boolean> { /* */ }
  async stopService(): Promise<boolean> { /* */ }
  async getServiceStatus() { /* */ }
}
```

### Using Type Guards
```typescript
import { hasTextToImageRole } from '../capabilities';

if (hasTextToImageRole(provider)) {
  // TypeScript knows this provider can do text-to-image
  const model = await provider.createTextToImageModel('stable-diffusion');
}
```

## Why This Organization?

Before this reorganization, we had:
- `providers/roles/` - Provider capability interfaces (confusing naming)
- `assets/roles/` - Asset data type interfaces

The term "roles" was overloaded. Now it's clearer:
- **Capabilities**: What providers can do
- **Roles**: What data types assets can provide

This makes the architecture much easier to understand and navigate.
