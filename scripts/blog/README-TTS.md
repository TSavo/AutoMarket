# Blog TTS Generation Module

This module provides high-quality text-to-speech generation for blog posts using the recently released **Chatterbox TTS** by Resemble AI.

## Features

- 🎵 **Dual TTS Providers**: Chatterbox TTS (local GPU) + Creatify TTS (cloud API)
- 🔄 **Smart Fallback**: Auto-selects best available provider
- 🎯 **Zero-shot voice cloning**: Chatterbox can clone voices with minimal reference audio
- 🎛️ **Emotion control**: Unique emotion exaggeration/intensity control (Chatterbox)
- 🌐 **Cloud reliability**: Creatify API as backup when GPU unavailable
- 📱 **Production ready**: Optimized for web delivery (MP3, 128kbps)
- 🔄 **Caching**: Intelligent audio file caching and management
- 📊 **Progress tracking**: Real-time generation progress reporting
- ⚡ **GPU acceleration**: CUDA support for faster generation (Chatterbox)

## Installation

### 1. Run the setup script:
```bash
cd scripts/blog
./setup-tts.sh
```

### 2. Manual installation:
```bash
# Create virtual environment
python3 -m venv venv-tts
source venv-tts/bin/activate

# Install requirements
pip install -r requirements.txt

# Install system dependencies
sudo apt-get install ffmpeg  # Ubuntu/Debian
# or
brew install ffmpeg          # macOS
```

## Usage

### Test TTS availability:
```bash
cd scripts/blog
npx ts-node test-tts-generation.ts availability
```

### Generate sample audio:
```bash
npx ts-node test-tts-generation.ts sample
```

### Generate TTS for a blog post:
```bash
npx ts-node test-tts-generation.ts blog neural-heist
```

### Test specific providers:
```bash
# Test Chatterbox TTS (local GPU)
npx ts-node test-tts-generation.ts chatterbox

# Test Creatify TTS (cloud API)
npx ts-node test-tts-generation.ts creatify
```

## API Reference

### `generateTTS(text, outputPath, options, onProgress)`

Generate TTS audio from text.

**Parameters:**
- `text: string` - Text content to convert to speech
- `outputPath: string` - Path where audio file will be saved
- `options: TTSOptions` - Generation options (optional)
- `onProgress: (progress: TTSProgress) => void` - Progress callback (optional)

**Options:**
```typescript
interface TTSOptions {
  voice?: string;           // Voice model (default: 'default')
  speed?: number;           // Speech speed (default: 1.0)
  exaggeration?: number;    // Emotion exaggeration (default: 0.5) - Chatterbox only
  cfg_weight?: number;      // CFG weight (default: 0.5) - Chatterbox only
  force?: boolean;          // Force regeneration (default: false)
  outputFormat?: 'mp3' | 'wav';  // Output format (default: 'mp3')
  provider?: 'chatterbox' | 'creatify' | 'auto';  // TTS provider (default: 'auto')
  creatifyAccent?: string;  // Creatify voice accent ID (default: 'en-US-1')
}
```

**Returns:**
```typescript
interface TTSResult {
  audioPath: string;        // Local file path
  webPath: string;          // Web-accessible path
  duration: number;         // Audio duration in seconds
  fileSize: number;         // File size in bytes
  success: boolean;         // Generation success
  error?: string;           // Error message if failed
  generationTime?: number;  // Generation time in milliseconds
}
```

### `checkTTSAvailability()`

Check if TTS is properly configured and available.

**Returns:**
```typescript
{
  available: boolean;
  error?: string;
  pythonPath?: string;
  chatterboxInstalled?: boolean;
}
```

## Configuration

Copy `.env.tts.example` to `.env.tts` and customize:

```env
# Enable/disable TTS generation
TTS_ENABLED=true

# TTS Provider Selection
TTS_PROVIDER=auto  # 'auto', 'chatterbox', or 'creatify'

# Chatterbox TTS settings (local GPU)
TTS_VOICE=default
TTS_SPEED=1.0
TTS_EXAGGERATION=0.5
TTS_CFG_WEIGHT=0.5

# Creatify TTS settings (cloud API)
CREATIFY_API_ID=your_api_id_here
CREATIFY_API_KEY=your_api_key_here
CREATIFY_ACCENT=en-US-1

# Content limits
TTS_MAX_LENGTH=50000

# Python configuration (for Chatterbox)
PYTHON_PATH=python3
```

## Audio Specifications

- **Format**: MP3 (for broad compatibility)
- **Quality**: 128kbps (balance of quality/file size)
- **Sample Rate**: 44.1kHz
- **Channels**: Mono (sufficient for speech)
- **Output Directory**: `public/audio/blog/`

## Performance

### First Run
- Downloads Chatterbox TTS model (~2GB)
- Slower initial generation (model loading)

### Subsequent Runs
- Model cached in memory
- Faster generation times
- GPU acceleration if available

### Typical Performance
- **CPU**: ~30-60 seconds per minute of audio
- **GPU**: ~10-20 seconds per minute of audio
- **File Size**: ~1MB per minute of audio

## Troubleshooting

### Python not found
```bash
# Install Python 3.8+
sudo apt-get install python3 python3-pip  # Ubuntu/Debian
brew install python3                      # macOS
```

### Chatterbox TTS installation fails
```bash
# Activate virtual environment first
source venv-tts/bin/activate

# Update pip
pip install --upgrade pip

# Install with verbose output
pip install -v chatterbox-tts
```

### CUDA issues
```bash
# Check CUDA availability
python3 -c "import torch; print(torch.cuda.is_available())"

# Install CUDA-compatible PyTorch if needed
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### ffmpeg not found
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

### Audio generation fails
1. Check disk space in `public/audio/blog/`
2. Verify text content is not too long (max 50,000 chars)
3. Check Python virtual environment is activated
4. Review error logs in console output

## Integration

This module integrates with:
- **Text Sanitizer**: `text-sanitizer.ts` for content preparation
- **Blog Processing**: Will be integrated into `process-blog-post.ts`
- **Frontend Player**: Will provide audio files for the TTS player component

## Next Steps

1. ✅ **TTS Generation Module** (completed)
2. 🔄 **Blog Processing Integration** (next)
3. 📱 **Frontend Audio Player** (upcoming)
4. 🎨 **Cyberpunk Styling** (upcoming)

## Support

For issues with:
- **Chatterbox TTS**: Check [GitHub repository](https://github.com/resemble-ai/chatterbox)
- **This module**: Review logs and error messages
- **Performance**: Consider GPU acceleration or reducing content length
