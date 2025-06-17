#!/bin/bash

# TTS Setup Script for Chatterbox TTS
# This script sets up the Python environment for TTS generation

set -e

echo "🎤 Setting up TTS environment for Chatterbox TTS"
echo "================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    exit 1
fi

echo "✅ pip found: $(pip3 --version)"

# Check if ffmpeg is installed (needed for audio duration detection)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found. Installing ffmpeg..."
    
    # Try to install ffmpeg based on the system
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command -v yum &> /dev/null; then
        sudo yum install -y ffmpeg
    elif command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo "❌ Could not install ffmpeg automatically. Please install it manually."
        echo "   Ubuntu/Debian: sudo apt-get install ffmpeg"
        echo "   CentOS/RHEL: sudo yum install ffmpeg"
        echo "   macOS: brew install ffmpeg"
        exit 1
    fi
fi

echo "✅ ffmpeg found: $(ffmpeg -version | head -n1)"

# Create virtual environment if it doesn't exist
VENV_DIR="venv-tts"
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv $VENV_DIR
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source $VENV_DIR/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install TTS requirements
echo "📥 Installing TTS requirements..."
pip install -r requirements.txt

# Test installation
echo "🧪 Testing Chatterbox TTS installation..."
python3 -c "
try:
    from chatterbox.tts import ChatterboxTTS
    print('✅ Chatterbox TTS imported successfully')
    
    import torch
    if torch.cuda.is_available():
        print(f'✅ CUDA available: {torch.cuda.get_device_name(0)}')
    else:
        print('⚠️  CUDA not available, will use CPU (slower)')
        
except ImportError as e:
    print(f'❌ Import failed: {e}')
    exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    exit(1)
"

echo ""
echo "🎉 TTS setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Activate the virtual environment: source $VENV_DIR/bin/activate"
echo "2. Test TTS generation: cd scripts/blog && npx ts-node test-tts-generation.ts availability"
echo "3. Generate sample audio: npx ts-node test-tts-generation.ts sample"
echo ""
echo "💡 Tips:"
echo "- First TTS generation will download the model (~2GB)"
echo "- GPU acceleration requires CUDA-compatible GPU"
echo "- Audio files will be saved to public/audio/blog/"
