# Horizon City Location Animation

This tool animates the detailed images of locations in the Horizon City Stories project using the FramePack AI API.

## Key Features

- Generates subtle animations for location detailed images
- Uses AI to create appropriate animation prompts based on location descriptions
- Maintains the original 16:9 aspect ratio (no conversion needed)
- Updates location markdown files with animated video paths

## Requirements

- Node.js
- FFmpeg (for video processing)
- Ollama running locally with the `deepseek-r1:7b` model
- fal.ai API key (set as `FALAI_API_KEY` environment variable)

## Usage

### Windows

```
animate-locations.bat <location-slug>
animate-locations.bat --all [--force]
```

### Unix/Linux/Mac

```
./animate-locations.sh <location-slug>
./animate-locations.sh --all [--force]
```

### Options

- `<location-slug>`: The slug of a specific location to animate
- `--all`: Process all locations that need animation
- `--force`: Force animation even for locations that already have animated videos
- `--help`: Display help information

## How It Works

1. **Read Location Data**: Reads the location's markdown file to extract metadata
2. **Generate Animation Prompt**: Uses Ollama to create a prompt for FramePack based on the location's description
3. **Generate Video**: Calls the fal.ai FramePack API to animate the location's detailed image
4. **Update Location File**: Adds the `animated` property to the location's markdown file

## Important Notes

- The script animates the `detailed` image from each location, not the `main` image
- Videos are generated in 16:9 aspect ratio to match the original images
- No aspect ratio conversion is performed
- The animation focuses on environmental effects appropriate for each location

## Example Animation Prompts

- "Neon signs flicker and pulse while holographic advertisements cycle through products, with occasional pedestrians and vehicles passing by in the background."
- "Steam rises from vents in the floor while machinery hums and moves subtly, with occasional sparks from electrical panels and workers moving in the background."
- "Rain falls steadily on the streets while puddles ripple and reflect the colorful neon lights, with people hurrying by under umbrellas and vehicles splashing through water."

## Troubleshooting

- **Missing API Key**: Ensure the `FALAI_API_KEY` environment variable is set
- **Ollama Not Running**: Make sure Ollama is running with the `deepseek-r1:7b` model
- **Missing Images**: Verify that locations have a `detailed` image defined and the file exists
- **Network Issues**: Check your internet connection if video downloads fail
