# Multi-stage build for optimized layers
FROM nvidia/cuda:12.8.1-cudnn-runtime-ubuntu22.04 AS base

# Set environment variables (these rarely change)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    HF_HOME=/app/hf_cache \
    TRANSFORMERS_CACHE=/app/hf_cache \
    DIFFUSERS_CACHE=/app/hf_cache \
    HF_HUB_ENABLE_HF_TRANSFER=1

# Install system dependencies (layer cached until system deps change)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip (separate layer for pip upgrades)
RUN pip3 install --no-cache-dir --upgrade pip setuptools wheel

# ========================================
# Dependencies layer (cached until requirements.txt changes)
# ========================================
FROM base AS dependencies

WORKDIR /app

# Copy only requirements first (this layer is cached until requirements.txt changes)
COPY requirements.txt .

# Install Python dependencies in a separate layer
RUN pip3 install --no-cache-dir -r requirements.txt

# ========================================
# Application layer (rebuilt only when code changes)
# ========================================
FROM dependencies AS application

# Create necessary directories
RUN mkdir -p /app/hf_cache /app/temp /app/logs

# Copy configuration files (these change less frequently)
COPY config.py .

# Copy handlers directory (pluggable architecture)
COPY handlers/ ./handlers/

# Copy other supporting files
COPY model_info.py .

# Copy core application files (in order of change frequency - least to most)
COPY model_manager.py .
COPY app.py .

# Create non-root user (security layer - rarely changes)
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8007/health || exit 1

# Start the application
CMD ["python3", "app.py"]
