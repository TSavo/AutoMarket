# Model Persistence Setup

This configuration ensures that Zonos models persist across Docker container restarts, preventing the need to re-download models every time you start the container.

## What Models Are Cached

The following models are automatically cached and will persist:

1. **Zonos Core Models:**
   - `Zyphra/Zonos-v0.1-transformer`
   - `Zyphra/Zonos-v0.1-hybrid`

2. **Audio Processing Model:**
   - `descript/dac_44khz` (DAC autoencoder)

3. **Speaker Embedding Model:**
   - `Zyphra/Zonos-v0.1-speaker-embedding`

## Configuration Options

### Option 1: Docker Named Volume (Default)
```bash
docker-compose up
```
- Uses Docker named volume `huggingface_cache`
- Models are stored in Docker's internal volume system
- Survives container restarts and rebuilds
- Volume persists until explicitly removed
- **Gradio interface available at:** http://localhost:7860

### Option 2: Host Directory Mount
```bash
docker-compose -f docker-compose.host-volumes.yml up
```
- Stores models in `./models_cache/` directory on your host
- Models are directly accessible from your host filesystem
- Easier to manage disk space and clear cache manually
- Models survive even if Docker volumes are removed
- **Gradio interface available at:** http://localhost:7860

## Managing the Cache

### Check cache size:
```bash
# For named volume:
docker system df -v

# For host directory:
du -sh ./models_cache/
```

### Clear cache:
```bash
# For named volume:
docker volume rm zonos_huggingface_cache

# For host directory:
rm -rf ./models_cache/
```

## Environment Variables

- `HF_HOME`: Sets the Hugging Face cache directory (default: `/root/.cache/huggingface`)
- `TRANSFORMERS_CACHE`: Alternative cache location for transformers library
- `HF_HUB_CACHE`: Specific cache for Hugging Face Hub downloads

## First Run

On the first run, models will be downloaded automatically:
- Total download size: ~2-4 GB depending on models used
- Download time: Varies based on internet connection
- Subsequent runs will be much faster as models load from cache

## Troubleshooting

If you encounter issues with model loading:

1. **Clear the cache** and restart:
   ```bash
   docker-compose down
   docker volume rm zonos_huggingface_cache  # for named volume
   # OR rm -rf ./models_cache/  # for host directory
   docker-compose up
   ```

2. **Check available disk space** - models require several GB of storage

3. **Verify network connectivity** for initial model downloads
