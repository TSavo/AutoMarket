# Outreach JSON-Based Animation

This script animates outreach document images using FramePack AI based on the animation prompts defined in the `outreach-images.json` file.

## Overview

The `animate-outreach-json.js` script handles the animation of outreach images defined in a JSON file:

1. Reads the `outreach-images.json` file to get image information and animation prompts
2. Animates each image using FramePack AI
3. Saves the animated videos to the `public/videos/outreach` directory
4. Updates the JSON file with the paths to the animated videos

## Prerequisites

1. Node.js installed
2. FramePack API key (set as `FALAI_API_KEY` in the `.env` file in the parent directory)
3. The `outreach-images.json` file with proper image information and animation prompts

## JSON File Structure

The JSON file should have the following structure:

```json
{
  "outreachImages": [
    {
      "filename": "image-name.png",
      "location": "c:\\Users\\T\\Projects\\horizon-city-stories\\public\\images\\outreach\\image-name.png",
      "usedIn": "Document and section where the image is used",
      "generationPrompt": "Prompt used to generate the image",
      "negativePrompt": "Negative prompt used during generation",
      "animationPrompt": "Prompt for animating the image with FramePack"
    },
    ...
  ]
}
```

## Usage

### Windows

```
animate-outreach-json.bat <image-filename>
animate-outreach-json.bat --all [--force]
```

### macOS/Linux

```
./animate-outreach-json.sh <image-filename>
./animate-outreach-json.sh --all [--force]
```

### Options

- `<image-filename>`: Process a single image by its filename (with or without .png extension)
- `--all`: Process all images in the JSON file
- `--force`: Force animation even for images that already have animated videos

## How It Works

1. The script reads the `outreach-images.json` file
2. It extracts the image location and animation prompt for each image
3. It uses FramePack AI to generate an animated video based on the image and prompt
4. It saves the video to the `public/videos/outreach` directory
5. It updates the JSON file with the path to the animated video

## Example

To animate a single image:

```
animate-outreach-json.bat partnership-principles
```

To animate all images:

```
animate-outreach-json.bat --all
```

To force regeneration of all animations:

```
animate-outreach-json.bat --all --force
```

## Output

After running the script, the JSON file will be updated with `animatedPath` properties for each image:

```json
{
  "outreachImages": [
    {
      "filename": "partnership-principles.png",
      "location": "c:\\Users\\T\\Projects\\horizon-city-stories\\public\\images\\outreach\\partnership-principles.png",
      "usedIn": "Adaptation Rights document, Partnership Principles section",
      "generationPrompt": "...",
      "negativePrompt": "...",
      "animationPrompt": "...",
      "animatedPath": "/videos/outreach/partnership-principles-animated.mp4"
    },
    ...
  ]
}
```

These animated videos can then be used in the outreach documents to enhance the visual experience.
