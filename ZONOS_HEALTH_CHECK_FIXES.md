# Zonos Health Check Issues and Fixes

## Issues Found

### 1. Missing Health Check in Docker Compose
**Problem**: The `services/zonos/docker-compose.yml` file didn't have a health check defined.
**Impact**: The `DockerComposeService.waitForHealthy()` method couldn't determine if the service was actually ready to accept requests.

### 2. Service Name Mismatch
**Problem**: The `ZonosDockerService` was configured with incorrect service and container names.
- Expected: `serviceName: 'zonos-tts-server'`, `containerName: 'zonos-tts-server'`
- Actual in docker-compose.yml: `serviceName: 'zonos'`, `containerName: 'zonos_container'`

### 3. Missing Dependencies in Dockerfile
**Problem**: The health check needed `curl` but it wasn't installed in the container.

### 4. Missing Port Exposure
**Problem**: The Dockerfile didn't explicitly expose port 7860.

## Fixes Applied

### 1. Added Health Check to docker-compose.yml
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:7860/ || curl -f http://localhost:7860/api/predict || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 120s
```

**Explanation**:
- `test`: Tries two endpoints - the main Gradio interface and the API predict endpoint
- `interval: 30s`: Check every 30 seconds
- `timeout: 10s`: Wait up to 10 seconds for each check
- `retries: 5`: Allow 5 failures before marking as unhealthy
- `start_period: 120s`: Give the service 2 minutes to start before beginning health checks

### 2. Fixed Service Names in ZonosDockerService
```typescript
serviceName: 'zonos',               // Must match service name in docker-compose.yml
containerName: 'zonos_container',   // Must match container_name in docker-compose.yml
```

### 3. Added curl to Dockerfile
```dockerfile
RUN apt update && \
    apt install -y espeak-ng git curl && \
    rm -rf /var/lib/apt/lists/*
```

### 4. Added Port Exposure
```dockerfile
EXPOSE 7860
```

## How Health Checks Work

### Docker Health Check Flow
1. **Container starts** → Docker waits for `start_period` (120s)
2. **Health checks begin** → Docker runs the health check command every `interval` (30s)
3. **Command succeeds** → Container marked as `healthy`
4. **Command fails** → Docker retries up to `retries` (5) times
5. **Too many failures** → Container marked as `unhealthy`

### DockerComposeService Health Check Flow
1. **Service starts** → Calls `docker-compose up -d`
2. **Wait for healthy** → Calls `waitForHealthy()` with timeout
3. **Check status** → Calls `getServiceStatus()` every 2 seconds
4. **Parse response** → Looks for `status.health === 'healthy'`
5. **Success/Failure** → Returns `true` if healthy within timeout

## Testing Health Checks

Run the health check test script:
```bash
npx tsx test-zonos-health.ts
```

This will:
1. Check current service status
2. Start the service if not running
3. Wait for it to become healthy
4. Display detailed status information
5. Show logs if health check fails

## Health Check Endpoints

The health check tries these endpoints in order:
1. `http://localhost:7860/` - Main Gradio interface
2. `http://localhost:7860/api/predict` - Gradio API endpoint

Both should return HTTP 200 when the service is ready.

## Troubleshooting

### If health check still fails:

1. **Check container logs**:
```bash
docker logs zonos_container
```

2. **Test endpoints manually**:
```bash
curl -f http://localhost:7860/
curl -f http://localhost:7860/api/predict
```

3. **Check service status**:
```bash
docker-compose -f services/zonos/docker-compose.yml ps
```

4. **Check health status**:
```bash
docker inspect zonos_container | grep -A 10 Health
```

### Common Issues:

- **Model loading takes too long**: Increase `start_period` in health check
- **Network issues**: Check if port 7860 is accessible
- **Gradio not starting**: Check container logs for Python errors
- **CUDA issues**: Ensure NVIDIA runtime is available

## Benefits of Proper Health Checks

1. **Reliable service startup**: Know when the service is actually ready
2. **Better error handling**: Distinguish between "starting" and "unhealthy"
3. **Monitoring integration**: Docker orchestrators can use health status
4. **Automatic restarts**: Docker can restart unhealthy containers
5. **Load balancer integration**: Only route traffic to healthy instances
