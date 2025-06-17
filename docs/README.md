# AutoMarket Media Transformation System Documentation

## 🎯 Overview

The AutoMarket Media Transformation System is a production-ready, Docker-based architecture for transforming media content between different formats. The system provides a unified interface for various AI-powered media transformations including Speech-to-Text (STT), Text-to-Speech (TTS), and future expansions for image and video processing.

## 🏗️ Architecture Highlights

- **🐳 Docker Self-Management**: Services automatically manage their own Docker containers
- **🔄 MediaTransformer Interface**: Unified API for all media transformations
- **🧪 Comprehensive Testing**: Both unit and integration tests with real service validation
- **📊 Progress Monitoring**: Real-time progress tracking for long-running operations
- **🛡️ Error Handling**: Robust error handling with graceful degradation
- **🎯 DRY Principles**: Reusable components following Don't Repeat Yourself principles

## 📚 Documentation Structure

### 🚀 Getting Started
- [Quick Start Guide](./getting-started/quick-start.md)
- [Installation Guide](./getting-started/installation.md)
- [Configuration](./getting-started/configuration.md)

### 🏛️ Architecture
- [System Architecture](./architecture/system-overview.md)
- [MediaTransformer Interface](./architecture/media-transformer.md)
- [Docker Self-Management](./architecture/docker-management.md)
- [Service Discovery](./architecture/service-discovery.md)

### 🔧 Services
- [WhisperSTTService](./services/whisper-stt.md) - Speech-to-Text
- [ChatterboxTTSDockerService](./services/chatterbox-tts.md) - Text-to-Speech
- [Service Development Guide](./services/development-guide.md)

### 🧪 Testing
- [Testing Strategy](./testing/strategy.md)
- [Unit Tests](./testing/unit-tests.md)
- [Integration Tests](./testing/integration-tests.md)
- [Test Configuration](./testing/configuration.md)

### 📖 API Reference
- [MediaTransformer API](./api/media-transformer.md)
- [LocalServiceManager API](./api/local-service-manager.md)
- [DockerComposeService API](./api/docker-compose-service.md)

### 🛠️ Development
- [Contributing Guide](./development/contributing.md)
- [Adding New Services](./development/new-services.md)
- [Debugging Guide](./development/debugging.md)
- [Performance Optimization](./development/performance.md)

### 🚀 Deployment
- [Production Deployment](./deployment/production.md)
- [Docker Configuration](./deployment/docker.md)
- [Monitoring & Logging](./deployment/monitoring.md)

### 🔍 Troubleshooting
- [Common Issues](./troubleshooting/common-issues.md)
- [Service-Specific Issues](./troubleshooting/service-issues.md)
- [Performance Issues](./troubleshooting/performance.md)

## 🎉 Key Achievements

### ✅ Production-Ready Services
- **WhisperSTTService**: Audio → Text transformation with Docker self-management
- **ChatterboxTTSDockerService**: Text → Audio transformation with CUDA acceleration

### ✅ Robust Architecture
- **DRY DockerComposeService**: Reusable Docker management for any service
- **Health-based readiness**: Services wait for actual Docker health checks
- **Blanket compose commands**: Works with multi-service Docker Compose files

### ✅ Comprehensive Testing
- **10/10 Unit Tests**: Complete test coverage for all service management
- **10/10 Integration Tests**: Real service testing with actual audio generation
- **Fetch polyfills**: Solved Node.js/Vitest compatibility issues

### ✅ Real Functionality Proven
- **Audio Generation**: MP3 and WAV format support with quality validation
- **Speed Control**: Variable playback speed for TTS output
- **Progress Monitoring**: Real-time progress updates during processing
- **File Management**: Automatic file creation, validation, and cleanup

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd AutoMarket

# Install dependencies
npm install

# Run unit tests
npm run test

# Run integration tests (requires Docker)
npm run test:integration

# Start a service (example: Chatterbox TTS)
docker-compose -f services/chatterbox/docker-compose.yml up -d
```

## 📞 Support

For questions, issues, or contributions, please refer to:
- [Contributing Guide](./development/contributing.md)
- [Troubleshooting](./troubleshooting/common-issues.md)
- [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ for production-ready media transformation**
