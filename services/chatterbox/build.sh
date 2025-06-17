#!/bin/bash
# =============================================================================
# Build script for Chatterbox TTS Server Docker images
# Supports multiple build targets and runtime configurations
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
RUNTIME="nvidia"
TARGET="production"
PUSH=false
CACHE=true
PLATFORM=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build Chatterbox TTS Server Docker images with optimized layer caching.

OPTIONS:
    -r, --runtime RUNTIME    Runtime type: nvidia, rocm, cpu (default: nvidia)
    -t, --target TARGET      Build target: production, development (default: production)
    -p, --push              Push images to registry after build
    --no-cache              Disable Docker build cache
    --platform PLATFORM     Target platform (e.g., linux/amd64,linux/arm64)
    -h, --help              Show this help message

EXAMPLES:
    # Build production image with NVIDIA support
    $0 --runtime nvidia --target production

    # Build development image with CPU-only support
    $0 --runtime cpu --target development

    # Build and push multi-platform images
    $0 --platform linux/amd64,linux/arm64 --push

    # Build without cache
    $0 --no-cache

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--runtime)
            RUNTIME="$2"
            shift 2
            ;;
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        --no-cache)
            CACHE=false
            shift
            ;;
        --platform)
            PLATFORM="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate runtime
if [[ ! "$RUNTIME" =~ ^(nvidia|rocm|cpu)$ ]]; then
    print_error "Invalid runtime: $RUNTIME. Must be nvidia, rocm, or cpu."
    exit 1
fi

# Validate target
if [[ ! "$TARGET" =~ ^(production|development)$ ]]; then
    print_error "Invalid target: $TARGET. Must be production or development."
    exit 1
fi

# Set image tags
BASE_TAG="chatterbox-tts"
if [ "$TARGET" = "development" ]; then
    IMAGE_TAG="${BASE_TAG}:dev-${RUNTIME}"
else
    IMAGE_TAG="${BASE_TAG}:${RUNTIME}"
    # Also tag as latest for nvidia production builds
    if [ "$RUNTIME" = "nvidia" ]; then
        LATEST_TAG="${BASE_TAG}:latest"
    fi
fi

print_status "Building Chatterbox TTS Server Docker image"
print_status "Runtime: $RUNTIME"
print_status "Target: $TARGET"
print_status "Image tag: $IMAGE_TAG"

# Build command
BUILD_CMD="docker build"

# Add platform if specified
if [ -n "$PLATFORM" ]; then
    BUILD_CMD="$BUILD_CMD --platform $PLATFORM"
fi

# Add cache options
if [ "$CACHE" = "false" ]; then
    BUILD_CMD="$BUILD_CMD --no-cache"
else
    # Use cache from previous builds
    BUILD_CMD="$BUILD_CMD --cache-from ${BASE_TAG}:base"
    BUILD_CMD="$BUILD_CMD --cache-from ${BASE_TAG}:python-deps"
    BUILD_CMD="$BUILD_CMD --cache-from ${BASE_TAG}:app-setup"
fi

# Add build args
BUILD_CMD="$BUILD_CMD --build-arg RUNTIME=$RUNTIME"
BUILD_CMD="$BUILD_CMD --build-arg PYTHON_VERSION=3.11"

# Add target
BUILD_CMD="$BUILD_CMD --target $TARGET"

# Add tags
BUILD_CMD="$BUILD_CMD -t $IMAGE_TAG"
if [ -n "$LATEST_TAG" ]; then
    BUILD_CMD="$BUILD_CMD -t $LATEST_TAG"
fi

# Add context
BUILD_CMD="$BUILD_CMD ."

print_status "Executing: $BUILD_CMD"

# Execute build
if eval $BUILD_CMD; then
    print_success "Build completed successfully!"
    
    # Show image info
    print_status "Image information:"
    docker images | grep chatterbox-tts | head -5
    
    # Push if requested
    if [ "$PUSH" = "true" ]; then
        print_status "Pushing image to registry..."
        docker push $IMAGE_TAG
        if [ -n "$LATEST_TAG" ]; then
            docker push $LATEST_TAG
        fi
        print_success "Push completed!"
    fi
    
    print_success "All operations completed successfully!"
    
    # Show usage instructions
    echo
    print_status "To run the container:"
    if [ "$TARGET" = "development" ]; then
        echo "  docker-compose --profile dev up"
    else
        echo "  docker-compose up"
    fi
    echo "  or"
    echo "  docker run -p 8004:8004 -v \$(pwd)/outputs:/app/outputs $IMAGE_TAG"
    
else
    print_error "Build failed!"
    exit 1
fi
