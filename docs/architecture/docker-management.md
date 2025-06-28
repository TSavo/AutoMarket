# Docker Self-Management Architecture

## 🎯 Overview

The Docker Self-Management system allows Prizm services to automatically manage their own Docker containers without external orchestration. This approach provides:

- **Autonomy**: Services control their own lifecycle
- **Simplicity**: No external orchestration required
- **Reliability**: Health-based readiness detection
- **Reusability**: DRY principles with shared components

## 🏗️ Architecture Components

### 1. LocalServiceManager Interface

```typescript
interface LocalServiceManager {
  startService(): Promise<boolean>;
  stopService(): Promise<boolean>;
  restartService(): Promise<boolean>;
  getServiceStatus(): Promise<ServiceStatus>;
  isServiceHealthy(): Promise<boolean>;
}
```

**Purpose**: Defines the contract for services that manage local Docker containers within the Prizm ecosystem.

### 2. DockerComposeService (DRY Component)

```typescript
class DockerComposeService {
  constructor(
    private serviceName: string,
    private composePath: string
  ) {}
  
  // Core Docker operations
  async startDockerCompose(): Promise<boolean>
  async stopDockerCompose(): Promise<boolean>
  async getContainerStatus(): Promise<ServiceStatus>
  async waitForHealthy(): Promise<boolean>
}
```

**Purpose**: Reusable Docker Compose management that can be used by any service.

## 🔧 Key Features

### 1. Blanket Docker-Compose Commands

**Problem Solved**: Traditional approaches require specifying individual service names, making them brittle when compose files change.

**Solution**: Use blanket commands that work with any compose file structure.

```typescript
// ❌ Brittle approach
await exec(`docker-compose -f "${composePath}" up -d whisper-service`);

// ✅ Robust approach  
await exec(`docker-compose -f "${composePath}" up -d`);
```

**Benefits**:
- Works with multi-service compose files
- No need to know specific service names
- Automatically handles service dependencies
- Resilient to compose file changes

### 2. Smart Service Detection

**Problem Solved**: Finding the right container when multiple services exist in a compose file.

**Solution**: Intelligent container discovery based on naming patterns.

```typescript
private async findServiceContainer(): Promise<ContainerInfo | null> {
  const containers = await this.listContainers();
  
  // Find container by service name pattern
  return containers.find(container => 
    container.name.includes(this.serviceName) ||
    container.labels['com.docker.compose.service'] === this.serviceName
  );
}
```

**Detection Methods**:
1. Container name contains service name
2. Docker Compose service label matches
3. Custom label matching
4. Port-based detection

### 3. Health-Based Readiness

**Problem Solved**: Services may be "running" but not ready to accept requests.

**Solution**: Wait for Docker health checks to report "healthy" status.

```typescript
private async waitForHealthy(timeoutMs: number = 120000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const container = await this.findServiceContainer();
    
    if (container?.health === 'healthy') {
      return true;
    }
    
    if (container?.health === 'unhealthy') {
      throw new Error(`Service ${this.serviceName} is unhealthy`);
    }
    
    await this.sleep(2000); // Check every 2 seconds
  }
  
  return false;
}
```

**Health Check Progression**:
1. `starting` → Service is initializing
2. `healthy` → Service is ready for requests
3. `unhealthy` → Service has failed health checks

## 🐳 Docker Compose Configuration

### Example Service Configuration

```yaml
# services/chatterbox/docker-compose.yml
version: '3.8'

services:
  chatterbox-init:
    image: busybox
    command: ["sh", "-c", "echo 'Initializing Chatterbox TTS...' && sleep 2"]
    
  chatterbox-tts-server:
    image: ghcr.io/resemble-ai/chatterbox:latest
    depends_on:
      - chatterbox-init
    ports:
      - "8004:8004"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models:/app/models
      - ./audio_cache:/app/audio_cache
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**Key Elements**:
- **Health Check**: Defines how Docker determines service health
- **Dependencies**: Ensures proper startup order
- **Resource Limits**: GPU allocation for AI services
- **Volume Mounts**: Persistent storage for models and cache

### Health Check Best Practices

```yaml
healthcheck:
  # Use HTTP endpoint that validates service readiness
  test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
  
  # Check every 10 seconds
  interval: 10s
  
  # 5 second timeout per check
  timeout: 5s
  
  # Allow 3 failures before marking unhealthy
  retries: 3
  
  # Wait 30 seconds before starting health checks
  start_period: 30s
```

## 🔄 Service Lifecycle Management

### Startup Sequence

```typescript
async startService(): Promise<boolean> {
  try {
    console.log(`🐳 Starting ${this.serviceName} service with docker-compose...`);
    
    // 1. Execute blanket docker-compose up
    const started = await this.dockerService.startDockerCompose();
    if (!started) {
      return false;
    }
    
    // 2. Wait for container to be found
    console.log(`⏳ Waiting for ${this.serviceName} to become healthy...`);
    
    // 3. Wait for health check to pass
    const healthy = await this.dockerService.waitForHealthy();
    if (!healthy) {
      console.log(`❌ ${this.serviceName} failed to become healthy`);
      return false;
    }
    
    console.log(`✅ ${this.serviceName} service started and is healthy`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to start ${this.serviceName}:`, error);
    return false;
  }
}
```

### Status Monitoring

```typescript
async getServiceStatus(): Promise<ServiceStatus> {
  try {
    const container = await this.dockerService.findServiceContainer();
    
    if (!container) {
      return 'stopped';
    }
    
    // Map Docker states to service states
    switch (container.state) {
      case 'running':
        return container.health === 'healthy' ? 'running' : 'starting';
      case 'exited':
        return 'stopped';
      case 'restarting':
        return 'starting';
      default:
        return 'error';
    }
    
  } catch (error) {
    console.error(`Error checking ${this.serviceName} status:`, error);
    return 'error';
  }
}
```

### Graceful Shutdown

```typescript
async stopService(): Promise<boolean> {
  try {
    console.log(`🛑 Stopping ${this.serviceName} service with docker-compose...`);
    
    // Use docker-compose stop for graceful shutdown
    const stopped = await this.dockerService.stopDockerCompose();
    
    if (stopped) {
      console.log(`✅ ${this.serviceName} service stopped successfully`);
    } else {
      console.log(`❌ Failed to stop ${this.serviceName} service`);
    }
    
    return stopped;
    
  } catch (error) {
    console.error(`❌ Error stopping ${this.serviceName}:`, error);
    return false;
  }
}
```

## 🧪 Testing Docker Management

### Unit Tests (Mocked)

```typescript
describe('DockerComposeService', () => {
  let dockerService: DockerComposeService;
  let mockExec: jest.Mock;
  
  beforeEach(() => {
    mockExec = jest.fn();
    dockerService = new DockerComposeService('test-service', '/path/to/compose.yml');
  });
  
  test('should start docker compose successfully', async () => {
    mockExec.mockResolvedValue({ stdout: '', stderr: '' });
    
    const result = await dockerService.startDockerCompose();
    
    expect(result).toBe(true);
    expect(mockExec).toHaveBeenCalledWith(
      'docker-compose -f "/path/to/compose.yml" up -d'
    );
  });
});
```

### Integration Tests (Real Docker)

```typescript
describe('ChatterboxTTSDockerService Integration', () => {
  test('should manage Docker lifecycle', async () => {
    const service = new ChatterboxTTSDockerService();
    
    // Start service
    const started = await service.startService();
    expect(started).toBe(true);
    
    // Check status
    const status = await service.getServiceStatus();
    expect(status).toBe('running');
    
    // Stop service
    const stopped = await service.stopService();
    expect(stopped).toBe(true);
  });
});
```

## 🚀 Performance Optimizations

### 1. Container Reuse

```typescript
async startService(): Promise<boolean> {
  // Check if already running before starting
  const status = await this.getServiceStatus();
  if (status === 'running') {
    console.log(`✅ ${this.serviceName} service is already running and healthy`);
    return true;
  }
  
  // Only start if not already running
  return await this.dockerService.startDockerCompose();
}
```

### 2. Parallel Health Checks

```typescript
async waitForHealthy(): Promise<boolean> {
  // Use Promise.race for timeout handling
  return Promise.race([
    this.pollForHealthy(),
    this.createTimeout(120000)
  ]);
}
```

### 3. Efficient Container Discovery

```typescript
private containerCache = new Map<string, ContainerInfo>();

async findServiceContainer(): Promise<ContainerInfo | null> {
  // Cache container info to reduce Docker API calls
  const cached = this.containerCache.get(this.serviceName);
  if (cached && Date.now() - cached.lastUpdated < 5000) {
    return cached;
  }
  
  const container = await this.discoverContainer();
  if (container) {
    this.containerCache.set(this.serviceName, {
      ...container,
      lastUpdated: Date.now()
    });
  }
  
  return container;
}
```

## 🛡️ Error Handling & Recovery

### Automatic Recovery

```typescript
async restartService(): Promise<boolean> {
  console.log(`🔄 Restarting ${this.serviceName} service...`);
  
  try {
    // Stop first (ignore failures)
    await this.stopService().catch(() => {});
    
    // Wait a moment for cleanup
    await this.sleep(2000);
    
    // Start again
    const started = await this.startService();
    
    if (started) {
      console.log(`🎯 Restart cycle completed successfully`);
    }
    
    return started;
    
  } catch (error) {
    console.error(`❌ Restart failed:`, error);
    return false;
  }
}
```

### Health Check Failures

```typescript
async waitForHealthy(): Promise<boolean> {
  const maxRetries = 3;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const healthy = await this.pollForHealthy();
      if (healthy) return true;
      
    } catch (error) {
      console.warn(`Health check attempt ${retries + 1} failed:`, error);
      retries++;
      
      if (retries < maxRetries) {
        await this.sleep(5000); // Wait before retry
      }
    }
  }
  
  return false;
}
```

## 📊 Monitoring & Logging

### Structured Logging

```typescript
private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: this.serviceName,
    level,
    message,
    data
  };
  
  console.log(JSON.stringify(logEntry));
}
```

### Metrics Collection

```typescript
interface ServiceMetrics {
  startupTime: number;
  healthCheckDuration: number;
  restartCount: number;
  lastHealthCheck: Date;
  uptime: number;
}

class MetricsCollector {
  private metrics = new Map<string, ServiceMetrics>();
  
  recordStartup(serviceName: string, duration: number) {
    // Track startup performance
  }
  
  recordHealthCheck(serviceName: string, duration: number, success: boolean) {
    // Track health check performance
  }
}
```

---

**Next**: [Service Discovery](./service-discovery.md)
