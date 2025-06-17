# =============================================================================
# Multi-stage Dockerfile for Chatterbox TTS Server
# Optimized for layer caching, security, and build performance
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base system setup with dependencies
# -----------------------------------------------------------------------------
FROM nvidia/cuda:12.8.1-runtime-ubuntu22.04 AS base

# Build arguments
ARG RUNTIME=nvidia
ARG PYTHON_VERSION=3.11

# Environment variables (set early for better caching)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# Create non-root user for security
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Install system dependencies in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    pkg-config \
    # Python
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    # Audio libraries
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    # Version control
    git \
    # Utilities
    curl \
    wget \
    ca-certificates \
    # Cleanup in same layer
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Create python symlink
RUN ln -sf /usr/bin/python3 /usr/bin/python

# -----------------------------------------------------------------------------
# Stage 2: Python dependencies installation
# -----------------------------------------------------------------------------
FROM base AS python-deps

# Set working directory
WORKDIR /app

# Upgrade pip first (separate layer for caching)
RUN python -m pip install --upgrade pip setuptools wheel

# Copy requirements files (most cacheable layer)
COPY requirements.txt requirements-nvidia.txt requirements-rocm.txt ./

# Install base Python dependencies (heavy layer, rarely changes)
RUN pip install --no-cache-dir -r requirements.txt

# Conditionally install GPU-specific dependencies
RUN if [ "$RUNTIME" = "nvidia" ]; then \
        echo "Installing NVIDIA dependencies..." && \
        pip install --no-cache-dir -r requirements-nvidia.txt; \
    elif [ "$RUNTIME" = "rocm" ]; then \
        echo "Installing ROCm dependencies..." && \
        pip install --no-cache-dir -r requirements-rocm.txt; \
    else \
        echo "Installing CPU-only dependencies..."; \
    fi

# -----------------------------------------------------------------------------
# Stage 3: Application setup
# -----------------------------------------------------------------------------
FROM python-deps AS app-setup

# Set Hugging Face cache directory
ENV HF_HOME=/app/hf_cache

# Create application directories with proper permissions
RUN mkdir -p \
    /app/model_cache \
    /app/reference_audio \
    /app/outputs \
    /app/voices \
    /app/logs \
    /app/hf_cache \
    /app/ui \
    && chown -R appuser:appuser /app

# Copy application code (changes frequently, so near the end)
COPY --chown=appuser:appuser . /app/

# Remove unnecessary files to reduce image size
RUN rm -rf \
    /app/.git* \
    /app/test_* \
    /app/*.md \
    /app/Dockerfile* \
    /app/docker-compose* \
    /app/.vscode \
    /app/.idea \
    /app/__pycache__ \
    /app/*/__pycache__ \
    /app/.pytest_cache

# -----------------------------------------------------------------------------
# Stage 4: Production image
# -----------------------------------------------------------------------------
FROM app-setup AS production

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8004/health || exit 1

# Expose port
EXPOSE 8004

# Set entrypoint and command
ENTRYPOINT ["python"]
CMD ["server.py"]

# -----------------------------------------------------------------------------
# Stage 5: Development image (optional)
# -----------------------------------------------------------------------------
FROM app-setup AS development

# Install development dependencies
RUN pip install --no-cache-dir \
    pytest \
    pytest-asyncio \
    black \
    flake8 \
    mypy \
    ipython \
    jupyter

# Keep as root for development convenience
USER root

# Development-specific environment
ENV PYTHONDONTWRITEBYTECODE=0

# Override command for development
CMD ["python", "server.py"]