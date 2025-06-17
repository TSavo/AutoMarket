# Horizon City Character Animation

This set of scripts automates the process of animating character portraits from the Horizon City Stories repository using FramePack AI.

## Prerequisites

- Node.js installed
- Ollama running locally with the `deepseek-r1:7b` model
- FramePack API key set in the environment

## Setup

1. Make sure Ollama is running with the deepseek-r1:7b model:
   ```bash
   ollama run deepseek-r1:7b
   ```

2. Install the required dependencies:
   ```bash
   npm install
   ```

3. Choose which implementation to use:
   - `generate-video.js` - Mock implementation (for testing without API calls)
   - `generate-video-real.js` - Real implementation using the FramePack API (JavaScript)
   - `generate-video-ts.js` - TypeScript implementation (compiled from src/simple-generate.ts)

   To switch implementations:

   **For the JavaScript implementation:**
   ```bash
   # On Windows
   copy generate-video-real.js generate-video.js /Y

   # On Unix/Linux/Mac
   cp generate-video-real.js generate-video.js
   ```

   **For the TypeScript implementation:**
   ```bash
   # On Windows
   use-ts-implementation.bat

   # On Unix/Linux/Mac
   ./use-ts-implementation.sh
   ```

## Scripts

### 1. Generate Animation Prompts

This script reads a character's markdown file and generates an appropriate animation prompt using the deepseek-r1:7b model.

```bash
node generate-animation-prompt.js ../horizon-city-stories/content/characters/akiko.md
```

Output:
- `./output/akiko-prompt.txt` - The generated animation prompt
- `./output/akiko-animation.json` - JSON file with all the information needed for animation

### 2. Animate a Portrait

This script takes the animation data JSON file and uses FramePack to animate the portrait.

```bash
node animate-portrait.js ./output/akiko-animation.json
```

Output:
- `./output/akiko-animated.mp4` - The animated portrait video

### 3. Process Multiple Characters

This script can process multiple characters at once, generating prompts and animating portraits.

```bash
# Process specific characters
node process-characters.js akiko kenji

# Process all characters (will ask for confirmation)
node process-characters.js
```

## Workflow

1. The scripts read character information from markdown files in the Horizon City Stories repository
2. They generate appropriate animation prompts using the deepseek-r1:7b model
3. The prompts are used with FramePack to animate the character portraits
4. The animated videos are saved to the output directory

## Tips

- The animation prompts focus on subtle facial expressions and minimal head movements
- You can edit the generated prompts before animating if needed
- The process can be resource-intensive, so consider processing characters in batches
