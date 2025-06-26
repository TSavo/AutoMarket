FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-devel
RUN pip install uv

RUN apt update && \
    apt install -y espeak-ng git curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . ./

# Install compatible flash-attn version for PyTorch 2.5.1 with CUDA 12.4
# Install latest compatible version with pre-built wheels
RUN uv pip install --system flash-attn --extra-index-url https://download.pytorch.org/whl/cu124

RUN uv pip install --system -e . && uv pip install --system -e .[compile]

EXPOSE 7860
