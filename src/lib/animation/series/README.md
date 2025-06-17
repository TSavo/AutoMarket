# Series Animation with FramePack AI

This tool animates series hero images using FramePack AI based on the animation prompts defined in the series' frontmatter.

## Prerequisites

1. Make sure you have Node.js installed
2. Install dependencies with `npm install`
3. Set up your `.env` file with your FramePack AI API key:
   ```
   FALAI_API_KEY=your_api_key_here
   ```

## Series Animation Format

Each series should have an `image` field in its frontmatter pointing to the hero image:

```yaml
---
title: Horizon's Hope
image: /images/stories/horizons-hope-hero-wide-new.png
book: 1
titleFont: Audiowide
tocFont: Audiowide
headerFont: Audiowide
animatePrompt: >-
  Subtle animation of the cyberpunk cityscape with rain falling, neon signs flickering, 
  holographic advertisements changing, and flying vehicles moving between buildings with light trails.
---
```

The script will use the `animatePrompt` field to generate an animated version of the hero image. If no `animatePrompt` is provided, a default animation prompt will be used.

## Usage

### Animate a Single Series

```bash
# Windows
animate-series.bat horizons-hope

# Unix/Linux/Mac
./animate-series.sh horizons-hope
```

### Animate All Series

```bash
# Windows
animate-series.bat --all

# Unix/Linux/Mac
./animate-series.sh --all
```

### Force Regeneration

To force regeneration of animations even if they already exist:

```bash
# Windows
animate-series.bat horizons-hope --force
animate-series.bat --all --force

# Unix/Linux/Mac
./animate-series.sh horizons-hope --force
./animate-series.sh --all --force
```

## How It Works

1. The script reads the series' frontmatter to get the hero image and animation prompt
2. It checks if the series already has an animated video path in its metadata AND if that file actually exists
   - If both conditions are true, the series is skipped (unless --force is used)
   - If the animated path exists in metadata but the file doesn't exist, a new animation will be generated
3. It uses the animation prompt from the series' metadata (or a default prompt if none is provided) with FramePack AI to generate an animated video from the static image
4. The video is saved to the appropriate location in the `public/videos/series` directory
5. The series' frontmatter is updated to include the path to the animated video

## Output

The animated videos are saved to:
- `public/videos/series/{series-slug}-animated.mp4`

The series' frontmatter is updated to include:
```yaml
---
title: Horizon's Hope
image: /images/stories/horizons-hope-hero-wide-new.png
book: 1
titleFont: Audiowide
tocFont: Audiowide
headerFont: Audiowide
animatePrompt: >-
  Subtle animation of the cyberpunk cityscape with rain falling, neon signs flickering, 
  holographic advertisements changing, and flying vehicles moving between buildings with light trails.
animated: /videos/series/horizons-hope-animated.mp4
---
```

## Troubleshooting

### Common Issues

1. **Missing API Key**: Make sure your `.env` file contains a valid FramePack AI API key
2. **Missing Image**: Ensure the image path in the series' frontmatter is correct and the file exists
3. **Animation Fails**: If the animation fails, check the error message for details. Common issues include:
   - Invalid image format
   - Image too large
   - API rate limits
   - Network issues

### Debugging

For more detailed logs, you can run the script with Node.js directly:

```bash
node animate-series.js horizons-hope
```

## Integration with Other Animation Scripts

This script is part of the Horizon City Stories animation system, which includes:

- `animate-character.js` - Animates character portraits
- `animate-story.js` - Animates story hero/detailed images
- `animate-locations.js` - Animates location images
- `animate-technologies.js` - Animates technology images
- `animate-themes.js` - Animates theme images
- `animate-series.js` - Animates series hero images

Each script follows a similar pattern but is tailored to the specific content type it animates.
