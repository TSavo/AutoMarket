# Director Animation Script

This script generates animated videos for director portraits using FramePack AI and updates the director markdown files with the animated video paths.

## Prerequisites

- Node.js installed
- FFmpeg installed and available in your PATH
- fal.ai API key set in the `.env` file

## Setup

1. Make sure you have the required dependencies installed:
   ```
   cd scripts/animation
   npm install
   ```

2. Create a `.env` file in the `scripts/animation` directory with your fal.ai API key:
   ```
   FALAI_API_KEY=your-api-key-here
   ```

## Usage

### Windows

```
cd scripts/animation/directors
animate-directors.bat <director-slug> [--force]
animate-directors.bat --all [--force]
```

Examples:
```
animate-directors.bat alex-garland
animate-directors.bat alex-garland --force
animate-directors.bat --all
animate-directors.bat --all --force
```

### macOS/Linux

```
cd scripts/animation/directors
chmod +x animate-directors.sh
./animate-directors.sh <director-slug> [--force]
./animate-directors.sh --all [--force]
```

Examples:
```
./animate-directors.sh alex-garland
./animate-directors.sh alex-garland --force
./animate-directors.sh --all
./animate-directors.sh --all --force
```

### Options

- `<director-slug>`: Process a single director (e.g., `alex-garland`)
- `--all`: Process all directors in the content/outreach/directors directory
- `--force`: Force regeneration of animations even if they already exist

## How It Works

1. Reads the director markdown file from `content/outreach/directors/<director-slug>.md`
2. Gets the animation prompt from the `promptText` field in the markdown file or uses a default prompt
3. Uses the director's detailed image from `public/images/outreach/directors/<director-slug>-detailed.png`
4. Generates an animated video using FramePack AI
5. Converts the video from 9:16 to 2:3 aspect ratio using FFmpeg
6. Saves the video to `public/videos/outreach/directors/<director-slug>-animated.mp4`
7. Updates the director markdown file with the animated video path

## Notes

- The script generates videos in 9:16 aspect ratio and then crops them to 2:3 to match the aspect ratio of the director detailed images.
- You can add a `promptText` field to the director markdown file to specify a custom animation prompt.
- If no `promptText` is provided, the script will use a default prompt appropriate for each director.
- Default prompts include cyberpunk-themed animations like transforming into a cyber ninja, dodging Matrix-style bullets, or revealing artificial components.
- If the video conversion fails, the script will continue with the original video.
