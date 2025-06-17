# Outreach Document Animation

This script animates outreach document images using FramePack AI based on the `promptText` defined in the outreach document's frontmatter.

## Prerequisites

1. Node.js installed
2. FramePack API key (set as `FALAI_API_KEY` in the `.env` file in the parent directory)

## Usage

### Windows

```
animate-outreach.bat <outreach-slug>
animate-outreach.bat --all [--force]
animate-outreach.bat --business [--force]
animate-outreach.bat --all --type business [--force]
```

### macOS/Linux

```
./animate-outreach.sh <outreach-slug>
./animate-outreach.sh --all [--force]
./animate-outreach.sh --business [--force]
./animate-outreach.sh --all --type business [--force]
```

### Options

- `<outreach-slug>`: Process a single outreach document by its slug (filename without .md extension)
- `--all`: Process all outreach documents
- `--business`: Process all outreach documents with type "business"
- `--type <type>`: Process all outreach documents of a specific type
- `--force`: Force animation even for documents that already have animated videos

## How It Works

1. The script reads the outreach document markdown file
2. It extracts the `promptText` from the `images` section of the frontmatter
3. It uses the detailed image and the promptText to generate an animated video using FramePack AI
4. It saves the video to the `public/videos/outreach` directory
5. It updates the outreach document markdown file with the path to the animated video

## Frontmatter Requirements

The outreach document markdown file should have the following frontmatter structure:

```yaml
---
title: "Document Title"
slug: document-slug
type: business  # or other type
images:
  hero: "/images/outreach/document-hero.png"
  detailed: "/images/outreach/document-detailed.png"
  altText: "Description of the image"
  promptText: "A slow camera pan across the cyberpunk cityscape with gentle lighting changes"
---
```

The `promptText` field is used as the animation prompt for FramePack AI. If not provided, a default prompt will be used.
