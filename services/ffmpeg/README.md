# FFMPEG Service

A RESTful TypeScript service for FFMPEG operations, dockerized and ready for production use.

## Features

- **Audio Extraction**: Extract audio from video files (`/video/extractAudio`)
- **Audio Conversion**: Convert between audio formats (`/audio/convert`)
- **Health Monitoring**: Health check endpoints (`/health`)
- **Docker Support**: Full Docker and docker-compose integration
- **TypeScript**: Fully typed with comprehensive error handling
- **RESTful API**: Clean REST endpoints with proper HTTP status codes

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start the service
docker-compose up -d

# Check health
curl http://localhost:8006/health

# Stop the service
docker-compose down
```

### Development Mode

```bash
# Install dependencies
npm install

# Start in development mode with hot reload
npm run dev

# Or start with docker-compose dev profile
docker-compose --profile dev up -d ffmpeg-service-dev
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Extract Audio from Video
```bash
POST /video/extractAudio
Content-Type: multipart/form-data

# Form data:
# - video: Video file (mp4, avi, mov, mkv, webm)
# - outputFormat: wav|mp3|flac|m4a|aac|ogg (optional, default: wav)
# - sampleRate: Sample rate in Hz (optional, default: 44100)
# - channels: Number of channels (optional, default: 2)
# - bitrate: Audio bitrate (optional, e.g., "128k")
# - startTime: Start time in seconds (optional)
# - duration: Duration in seconds (optional)
# - volume: Volume multiplier (optional, default: 1.0)
# - normalize: Normalize audio levels (optional, default: false)
```

### Convert Audio Format
```bash
POST /audio/convert
Content-Type: multipart/form-data

# Same parameters as extractAudio but with audio file input
```

## Configuration

Environment variables:

- `PORT`: Service port (default: 8006)
- `HOST`: Service host (default: 0.0.0.0)
- `LOG_LEVEL`: Logging level (default: info)
- `MAX_FILE_SIZE`: Max upload size in MB (default: 500)
- `CORS_ORIGIN`: CORS origin (default: *)

## Integration with AutoMarket

The service integrates with the AutoMarket media transformation system through:

- **FFMPEGAPIClient**: HTTP client for API communication
- **FFMPEGDockerService**: Docker service management
- **FFMPEGDockerModel**: VideoToAudioModel implementation
- **FFMPEGDockerProvider**: VideoToAudioProvider implementation

### Usage Example

```typescript
import { FFMPEGDockerProvider } from '../providers/FFMPEGDockerProvider';

// Create provider
const provider = new FFMPEGDockerProvider({
  baseUrl: 'http://localhost:8006'
});

// Start service
await provider.startService();

// Create model
const model = await provider.createVideoToAudioModel('ffmpeg-extract-audio');

// Transform video to audio
const video = Video.fromFile('input.mp4');
const audio = await model.transform(video, {
  outputFormat: 'wav',
  sampleRate: 44100,
  channels: 2
});

// Save result
await audio.saveToFile('output.wav');
```

## Development

### Project Structure

```
services/ffmpeg/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── routes/          # Express route handlers
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── server.ts        # Main server file
├── uploads/             # Temporary upload directory
├── outputs/             # Output files directory
├── logs/                # Service logs
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Docker Compose configuration
├── package.json         # Node.js dependencies
└── tsconfig.json        # TypeScript configuration
```

### Building

```bash
# Build TypeScript
npm run build

# Build Docker image
docker build -t ffmpeg-service .

# Build with docker-compose
docker-compose build
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8006/health

# Test audio extraction
curl -X POST \
  -F "video=@test.mp4" \
  -F "outputFormat=wav" \
  http://localhost:8006/video/extractAudio
```

## Supported Formats

### Input Video Formats
- MP4, AVI, MOV, MKV, WebM, FLV, M4V

### Input Audio Formats  
- MP3, WAV, FLAC, M4A, AAC, OGG

### Output Audio Formats
- WAV, MP3, FLAC, M4A, AAC, OGG

## Error Handling

The service provides comprehensive error handling with:

- Proper HTTP status codes
- Detailed error messages
- Request/response logging
- Graceful failure modes
- Automatic cleanup of temporary files

## Security

- File type validation
- Size limits on uploads
- Helmet.js security headers
- CORS configuration
- Non-root container user
- Temporary file cleanup

## Performance

- Compression middleware
- Streaming file uploads
- Efficient memory usage
- Resource limits in Docker
- Health check monitoring
