# System Architecture Overview

## 🏗️ High-Level Architecture

The AutoMarket Media Transformation System is built on a modular, service-oriented architecture that emphasizes:

- **Separation of Concerns**: Each service handles one specific transformation type
- **Docker Self-Management**: Services manage their own containerized dependencies
- **Unified Interface**: All services implement the MediaTransformer interface
- **Testability**: Comprehensive unit and integration testing at all levels

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    AutoMarket Application                       │
├─────────────────────────────────────────────────────────────────┤
│                  MediaTransformer Interface                     │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  WhisperSTT     │  ChatterboxTTS  │    Future Services          │
│  Service        │  DockerService  │    (Image, Video, etc.)     │
├─────────────────┼─────────────────┼─────────────────────────────┤
│           LocalServiceManager Interface                         │
├─────────────────┼─────────────────┼─────────────────────────────┤
│           DockerComposeService (DRY Component)                   │
├─────────────────┼─────────────────┼─────────────────────────────┤
│     Docker      │     Docker      │        Docker               │
│   Container     │   Container     │      Containers             │
│   (Whisper)     │  (Chatterbox)   │    (Future Services)        │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## 🔧 Core Components

### 1. MediaTransformer Interface

**Purpose**: Provides a unified API for all media transformations

**Key Features**:
- Type-safe input/output validation
- Consistent error handling
- Metadata support for transformation details
- Progress callbacks for long-running operations

**Interface Definition**:
```typescript
interface MediaTransformer {
  id: string;
  name: string;
  type: 'local' | 'remote';
  transforms: TransformCapability[];
  
  transform(input: MediaInput, outputType: MediaType, options?: any): Promise<MediaOutput>;
  isAvailable(): Promise<boolean>;
}
```

### 2. LocalServiceManager Interface

**Purpose**: Manages local services that require Docker containers

**Key Features**:
- Service lifecycle management (start/stop/restart)
- Health monitoring and status checking
- Automatic service discovery and readiness detection
- Error handling and recovery

**Interface Definition**:
```typescript
interface LocalServiceManager {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  restartService(): Promise<boolean>;
  getServiceStatus(): Promise<ServiceStatus>;
  isServiceHealthy(): Promise<boolean>;
}
```

### 3. DockerComposeService (DRY Component)

**Purpose**: Reusable Docker Compose management for any service

**Key Features**:
- **Blanket compose commands**: Uses `docker-compose up -d` and `docker-compose stop`
- **Smart service detection**: Finds specific containers in multi-service compose files
- **Health-based readiness**: Waits for Docker health checks to report healthy
- **Idempotent operations**: Safe to call start/stop multiple times

**Implementation Highlights**:
```typescript
class DockerComposeService {
  // Blanket commands work with any compose file
  private async startDockerCompose(): Promise<boolean> {
    await this.executeCommand(`docker-compose -f "${this.composePath}" up -d`);
  }
  
  // Smart container detection
  private async findServiceContainer(): Promise<ContainerInfo | null> {
    const containers = await this.listContainers();
    return containers.find(c => c.name.includes(this.serviceName));
  }
  
  // Health-based readiness
  private async waitForHealthy(): Promise<boolean> {
    // Polls until Docker health check reports "healthy"
  }
}
```

## 🎯 Design Principles

### 1. Don't Repeat Yourself (DRY)

**Implementation**:
- `DockerComposeService` is reused by all Docker-based services
- Common patterns extracted into base classes
- Shared utilities for error handling and logging

**Benefits**:
- Consistent behavior across all services
- Easier maintenance and updates
- Reduced code duplication

### 2. Separation of Concerns

**MediaTransformer Layer**:
- Handles input/output validation
- Manages transformation logic
- Provides progress callbacks

**LocalServiceManager Layer**:
- Manages service lifecycle
- Handles Docker operations
- Monitors service health

**DockerComposeService Layer**:
- Executes Docker commands
- Parses Docker output
- Manages container state

### 3. Testability

**Unit Tests**:
- Mock external dependencies
- Test business logic in isolation
- Fast execution for development feedback

**Integration Tests**:
- Test with real Docker services
- Validate actual transformations
- Ensure end-to-end functionality

## 🔄 Data Flow

### Typical Transformation Flow

1. **Input Validation**
   ```typescript
   // MediaTransformer validates input type
   if (input.type !== 'audio') {
     throw new Error('Invalid input type');
   }
   ```

2. **Service Readiness Check**
   ```typescript
   // Ensure Docker service is running and healthy
   const status = await this.getServiceStatus();
   if (status !== 'running') {
     await this.startService();
   }
   ```

3. **Transformation Execution**
   ```typescript
   // Execute the actual transformation
   const result = await this.performTransformation(input, options);
   ```

4. **Output Generation**
   ```typescript
   // Return standardized output
   return {
     type: 'text',
     data: transcription,
     metadata: { confidence, processingTime }
   };
   ```

## 🐳 Docker Integration

### Service Self-Management

Each service manages its own Docker dependencies:

```typescript
class WhisperSTTService implements MediaTransformer, LocalServiceManager {
  private dockerService: DockerComposeService;
  
  constructor() {
    this.dockerService = new DockerComposeService(
      'whisper-asr-webservice',
      path.join(__dirname, '../../../services/whisper/docker-compose.yml')
    );
  }
}
```

### Health Monitoring

Services wait for actual Docker health checks:

```yaml
# docker-compose.yml
services:
  whisper-asr-webservice:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

## 🚀 Scalability Considerations

### Horizontal Scaling
- Each service can run multiple instances
- Load balancing can be added at the Docker level
- Services are stateless for easy scaling

### Vertical Scaling
- GPU acceleration support (CUDA for Chatterbox TTS)
- Memory and CPU limits configurable per service
- Resource monitoring and optimization

### Future Extensibility
- New services can be added by implementing MediaTransformer
- Existing DockerComposeService can be reused
- Plugin architecture for custom transformations

## 📊 Performance Characteristics

### WhisperSTTService
- **Startup Time**: ~30-60 seconds (model loading)
- **Processing**: ~1-2x real-time for audio transcription
- **Memory**: ~2-4GB depending on model size

### ChatterboxTTSDockerService
- **Startup Time**: ~60-90 seconds (CUDA model loading)
- **Processing**: ~2-5 seconds for short text
- **Memory**: ~4-8GB with CUDA acceleration

### DockerComposeService
- **Command Execution**: ~100-500ms per Docker command
- **Health Checks**: ~2-5 seconds for service readiness
- **Container Management**: Minimal overhead

---

**Next**: [MediaTransformer Interface](./media-transformer.md)
