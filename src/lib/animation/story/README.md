# Story Animation with FramePack AI

This tool animates story hero images using FramePack AI based on the animation prompts defined in the story's frontmatter.

## Prerequisites

1. Make sure you have Node.js installed
2. Install dependencies with `npm install`
3. Set up your `.env` file with your FramePack AI API key:
   ```
   FALAI_API_KEY=your_api_key_here
   ```

## Story Animation Format

Each story should have an `images` section in its frontmatter with at least a detailed image or a hero image path:

```yaml
images:
  hero: /images/stories/story-hero-wide.png
  detailed: /images/stories/story-detailed-wide.png
  altText: >-
    Description of the hero image for accessibility
  detailedAltText: >-
    Description of the detailed image for accessibility
```

The script will use the detailed image for animation if available, falling back to the hero image if no detailed image is found.

Each story should also have an `animatePrompt` in its frontmatter that describes how the hero image should be animated:

```yaml
images:
  hero: /images/stories/story-hero-wide.png
  altText: >-
    Description of the image for accessibility
  animatePrompt: >-
    Detailed prompt describing the animation to be applied to the hero image
```

If no `animatePrompt` is provided, a default animation prompt will be used.

## Usage

### Animate a Single Story

```bash
# Windows
animate-story.bat horizons-edge thief

# Unix/Linux/Mac
./animate-story.sh horizons-edge thief
```

You can use either the story name with or without the numbered prefix:

```bash
# These are equivalent:
animate-story.bat horizons-edge thief
animate-story.bat horizons-edge 03-thief
```

The script will automatically find the correct story directory.

### Animate All Stories in a Series

```bash
# Windows
animate-story.bat --series horizons-edge

# Unix/Linux/Mac
./animate-story.sh --series horizons-edge
```

### Animate All Stories in All Series

```bash
# Windows
animate-story.bat --all

# Unix/Linux/Mac
./animate-story.sh --all
```

Note: The script will skip the "horizons-dawn" and "horizons-end" series when using the `--all` flag.

### Force Animation (Even for Stories with Existing Animations)

Add the `--force` flag to any command:

```bash
# Windows
animate-story.bat --all --force

# Unix/Linux/Mac
./animate-story.sh --all --force
```

## How It Works

1. The script reads the story's frontmatter to get the detailed image (or hero image as fallback) and animation prompt
2. It checks if the story already has an animated video path in its metadata AND if that file actually exists
   - If both conditions are true, the story is skipped (unless --force is used)
   - If the animated path exists in metadata but the file doesn't exist, a new animation will be generated
3. It uses the animation prompt from the story's metadata (or a default prompt if none is provided) with FramePack AI to generate an animated video from the static image
4. The video is saved to the appropriate location in the `public/videos/stories` directory
5. The story's frontmatter is updated to include the path to the animated video

## Output

The animated videos are saved to:
- `public/videos/stories/{series-slug}-{story-slug}-animated.mp4`

The story's frontmatter is updated to include:
```yaml
images:
  hero: /images/stories/story-hero-wide.png
  detailed: /images/stories/story-detailed-wide.png
  altText: >-
    Description of the hero image for accessibility
  detailedAltText: >-
    Description of the detailed image for accessibility
  animatePrompt: >-
    Detailed prompt describing the animation to be applied to the detailed image
  animated: /videos/stories/horizons-edge-thief-animated.mp4
```

## Troubleshooting

- Make sure your FramePack AI API key is correctly set in the `.env` file
- Ensure the story has a valid hero image path in its frontmatter
- Check that the hero image file exists at the specified path
- If you get an error about missing directories, make sure the `public/videos/stories` directory exists
