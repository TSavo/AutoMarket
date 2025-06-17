# Horizon City Character Animation

This script automates the process of animating character portraits from the Horizon City Stories repository using FramePack AI.

## Overview

The `animate-character.js` script handles the entire animation pipeline in one go:

1. Reads the character markdown file to extract information
2. Generates an appropriate animation prompt using the deepseek-r1:7b model
3. Animates the character's portrait using FramePack
4. Saves the animated video to the Horizon City Stories repository
5. Updates the character markdown file to include the animated video path

## Prerequisites

- Node.js installed
- Ollama running locally with the `deepseek-r1:7b` model
- FramePack API key set in the environment

## Usage

### Animating a Character

To animate a character portrait, simply run:

```bash
# Windows
animate-character.bat <character-slug>

# Unix/Linux/Mac
./animate-character.sh <character-slug>

# Or directly with Node.js
node animate-character.js <character-slug>
```

For example:

```bash
animate-character.bat akiko
```

This will:
1. Read the character information from `../horizon-city-stories/content/characters/akiko.md`
2. Generate an animation prompt using the deepseek-r1:7b model
3. Animate the portrait at `../horizon-city-stories/public/images/characters/akiko-portrait.png`
4. Save the animated video to `../horizon-city-stories/public/videos/characters/akiko-animated.mp4`
5. Update the character markdown file to include the animated video path

### Results

The script will:
- Save the animated video to `../horizon-city-stories/public/videos/characters/<character>-animated.mp4`
- Update the character markdown file to include the animated video path in the `images` section:

```yaml
images:
  portrait: /images/characters/akiko-portrait.png
  hero: /images/characters/akiko-hero.png
  altText: Character description...
  animated: /videos/characters/akiko-animated.mp4
```

### Animating Multiple Characters

To check for characters that need animation and animate them all at once, use:

```bash
# Windows
animate-missing-characters.bat [options]

# Unix/Linux/Mac
./animate-missing-characters.sh [options]

# Or directly with Node.js
node animate-missing-characters.js [options]
```

Available options:

- `--dry-run`: Check which characters need animation without actually animating them
- `--force`: Force animation even for characters that already have animated videos

Example:

```bash
# Check which characters need animation without actually animating them
animate-missing-characters.bat --dry-run

# Animate all characters that don't have animated videos yet
animate-missing-characters.bat

# Force animation for all characters, even if they already have animated videos
animate-missing-characters.bat --force
```

The script will:
1. Scan all character markdown files in the Horizon City Stories repository
2. Check if each character has a portrait image and an animated video
3. Animate any characters that have a portrait image but no animated video
4. Update the character markdown files with the animated video paths

## Troubleshooting

- **Ollama not running**: Make sure Ollama is running with the deepseek-r1:7b model
- **API key issues**: Check that your FALAI_API_KEY environment variable is set correctly
- **Missing files**: Ensure the character markdown file and portrait image exist in the expected locations
- **Animation failures**: If a character fails to animate, check the logs for specific errors

## Video Aspect Ratio Conversion

The FramePack API generates videos in 9:16 aspect ratio, but the character portraits are in 3:4 aspect ratio. This can result in black bars (letterboxing) at the top and bottom of the animated videos.

To convert the videos from 9:16 to 3:4 aspect ratio by cropping out the black bars, use the `convert-video-aspect.js` script:

### Converting a Single Video

```bash
# Windows
convert-video-aspect.bat <input-path> [output-path] [--overwrite]

# Unix/Linux/Mac
./convert-video-aspect.sh <input-path> [output-path] [--overwrite]

# Or directly with Node.js
node convert-video-aspect.js <input-path> [output-path] [--overwrite]
```

Example:

```bash
# Convert a single video (overwrites the original file)
convert-video-aspect.bat ../horizon-city-stories/public/videos/characters/akiko-animated.mp4

# Convert a single video with a custom output path
convert-video-aspect.bat ../horizon-city-stories/public/videos/characters/akiko-animated.mp4 ../horizon-city-stories/public/videos/characters/akiko-animated-custom.mp4
```

> **Note:** If no output path is provided, the script will overwrite the original file with the correctly cropped version.

### Converting Multiple Videos

```bash
# Windows
convert-video-aspect.bat --dir <input-dir> <output-dir> [--overwrite]

# Unix/Linux/Mac
./convert-video-aspect.sh --dir <input-dir> <output-dir> [--overwrite]
```

Example:

```bash
# Convert all videos in a directory to a new directory
convert-video-aspect.bat --dir ../horizon-city-stories/public/videos/characters ../horizon-city-stories/public/videos/characters-3x4

# Convert and overwrite all videos in the same directory
convert-video-aspect.bat --dir ../horizon-city-stories/public/videos/characters ../horizon-city-stories/public/videos/characters
```

> **Note:** If the input and output directories are the same, the script will overwrite the original files with the correctly cropped versions.

### Requirements

- FFmpeg must be installed and available in your PATH
- Node.js installed

## Animation Process

The animation process now automatically includes converting the video from 9:16 to 3:4 aspect ratio. The `animate-character.js` script will:

1. Generate an animation prompt using the deepseek-r1:7b model
2. Use FramePack to animate the character portrait
3. Convert the resulting video from 9:16 to 3:4 aspect ratio using FFmpeg
4. Update the character markdown file with the animated video path

For convenience, you can use the `animate-and-convert.js` script:

### Processing a Single Character

```bash
# Windows
animate-and-convert.bat <character-slug>

# Unix/Linux/Mac
./animate-and-convert.sh <character-slug>

# Or directly with Node.js
node animate-and-convert.js <character-slug>
```

Example:

```bash
# Animate and convert a single character
animate-and-convert.bat ruby
```

### Processing All Characters

```bash
# Windows
animate-and-convert.bat --all [--force]

# Unix/Linux/Mac
./animate-and-convert.sh --all [--force]
```

Example:

```bash
# Process all characters that need animation
animate-and-convert.bat --all

# Process all characters, even if they already have animated videos
animate-and-convert.bat --all --force
```

Each character will be processed through the complete animation pipeline:
1. Generate an animation prompt using the deepseek-r1:7b model
2. Animate the character portrait using FramePack
3. Convert the resulting video from 9:16 to 3:4 aspect ratio by cropping out black bars
4. Overwrite the original video file with the correctly cropped version
5. Update the character markdown file with the animated video path
