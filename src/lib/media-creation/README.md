# Blog Image and Animation Processing

This directory contains TypeScript scripts for generating and animating images for blog posts.

## Overview

The scripts are designed to work together to:

1. Generate missing images for blog posts based on prompts in the frontmatter
2. Generate animations for those images
3. Update the MDX files with the correct paths

## Scripts

### `generate-image.ts`

A module that generates images using the Replicate API with the Flux Ultra model, with the raw parameter enabled for more natural-looking images. It includes Sharp post-processing to ensure high-quality output.

**Features:**
- Default resolution of 2752x1536 (16:9 aspect ratio)
- Support for various aspect ratios (16:9, 2:3, 3:2, 1:1)
- PNG format by default
- Raw parameter enabled by default
- Sharp post-processing

### `animate-image.ts`

A module that animates images using the FramePack AI API. It takes an image and an animation prompt and generates a video.

**Features:**
- Generates MP4 videos
- Supports various animation parameters
- Handles file naming conventions

### `process-blog-post.ts`

The main script that processes blog posts. It reads the MDX file, checks for missing images and animations, and generates them as needed.

**Features:**
- Processes both main images and blog images
- Updates the MDX file with the correct paths
- Supports batch processing of all blog posts

## Usage

### Prerequisites

1. Install dependencies:
   ```
   npm install --save-dev typescript ts-node dotenv axios sharp gray-matter @fal-ai/client
   ```

2. Set up environment variables in a `.env` file:
   ```
   REPLICATE_API_TOKEN=your_replicate_api_token
   FALAI_API_KEY=your_falai_api_key
   ```

### Processing a Single Blog Post

```bash
npx ts-node scripts/blog/process-blog-post.ts <blog-slug> [--force] [--debug]
```

Where:
- `<blog-slug>` is the filename of the blog post without the extension
- `--force` forces regeneration even if files already exist
- `--debug` enables debug logging

### Processing All Blog Posts

```bash
npx ts-node scripts/blog/process-blog-post.ts --all [--force] [--debug]
```

## Blog Post Format

The scripts expect blog posts to have a specific format in their frontmatter:

```yaml
---
title: "Blog Post Title"
description: "Blog post description"
date: "2025-05-16"
author: "Author Name"
images:
  src: /images/blog/main-image.png
  animated: /videos/blog/main-image-animated.mp4
  altText: "Alt text for the main image"
  generationPrompt: "Prompt for generating the main image"
  negativePrompt: "Negative prompt for the main image"
  animationPrompt: "Prompt for animating the main image"
blogImages:
  - src: /images/blog/image1.png
    animated: /videos/blog/image1-animated.mp4
    altText: "Alt text for image 1"
    generationPrompt: "Prompt for generating image 1"
    negativePrompt: "Negative prompt for image 1"
    animationPrompt: "Prompt for animating image 1"
  - src: /images/blog/image2.png
    animated: /videos/blog/image2-animated.mp4
    altText: "Alt text for image 2"
    generationPrompt: "Prompt for generating image 2"
    negativePrompt: "Negative prompt for image 2"
    animationPrompt: "Prompt for animating image 2"
---

Blog post content...
```

The scripts will:
1. Check if the images exist on disk
2. Generate any missing images using the generation prompts
3. Generate animations for the images using the animation prompts
4. Update the MDX file with the correct paths

## Notes

- Images are stored in `public/images/blog/`
- Animations are stored in `public/videos/blog/`
- The default image resolution is 2752x1536 (16:9 aspect ratio)
- The default image format is PNG
- The raw parameter is enabled by default for more natural-looking images
