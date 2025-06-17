# Blog Hover Images Animation

This script animates hover images used in blog posts using FramePack AI based on the animation prompts defined in the `blog-images.json` file.

## Overview

The `animate-blog-json.js` script handles the animation of hover images defined in a JSON file:

1. Reads the `blog-images.json` file to get image information and animation prompts
2. Animates each image using FramePack AI
3. Saves the animated videos to the appropriate `public/videos/[category]` directory
4. Updates the JSON file with the paths to the animated videos

## Prerequisites

1. Node.js installed
2. FramePack API key (set as `FALAI_API_KEY` in the `.env` file in the parent directory)
3. The `blog-images.json` file with proper image information and animation prompts

## JSON File Structure

The JSON file should have the following structure:

```json
{
  "blogImages": [
    {
      "filename": "image-name.png",
      "location": "c:\\Users\\T\\Projects\\horizon-city-stories\\public\\images\\locations\\image-name.png",
      "usedIn": "Blog post where the image is used",
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
animate-blog-json.bat <image-filename>
animate-blog-json.bat --all [--force]
```

### macOS/Linux

```
./animate-blog-json.sh <image-filename>
./animate-blog-json.sh --all [--force]
```

### Options

- `<image-filename>`: Process a single image by its filename (with or without extension)
- `--all`: Process all images in the JSON file
- `--force`: Force animation even for images that already have animated videos

## How It Works

1. The script reads the `blog-images.json` file
2. It extracts the image location and animation prompt for each image
3. It uses FramePack AI to generate an animated video based on the image and prompt
4. It saves the video to the appropriate `public/videos/[category]` directory (maintaining the same structure as the images)
5. It updates the JSON file with the path to the animated video

## Example

To animate a single hover image:

```
animate-blog-json.bat downtown-overview
```

To animate all hover images:

```
animate-blog-json.bat --all
```

To force regeneration of all animations:

```
animate-blog-json.bat --all --force
```

## Output

After running the script, the JSON file will be updated with `animatedPath` properties for each image:

```json
{
  "blogImages": [
    {
      "filename": "downtown-overview.png",
      "location": "c:\\Users\\T\\Projects\\horizon-city-stories\\public\\images\\locations\\downtown-overview.png",
      "usedIn": "When Images Move: The Birth of Hover Animations blog post",
      "generationPrompt": "...",
      "negativePrompt": "...",
      "animationPrompt": "...",
      "animatedPath": "/videos/locations/downtown-overview-animated.mp4"
    },
    ...
  ]
}
```

These animated videos can then be used in the blog posts with the `HoverVideoImage` component to create interactive hover animations.

## Integration with Blog Posts

In your MDX blog posts, you can use the hover images with their animated versions like this:

```markdown
!hover[Neon cityscape that animates on hover](/images/locations/downtown-overview.png)(/videos/locations/downtown-overview-animated.mp4)
```

The `HoverVideoImage` component will automatically handle the transition between the static image and the animated video on hover.
