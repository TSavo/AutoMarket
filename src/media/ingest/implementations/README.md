# FontkitMediaDiscovery

A font metadata discovery implementation for the Media Ingest system using the Fontkit library.

## Features

- Extract metadata from font files (TTF, OTF, WOFF, WOFF2)
- Generate SVG preview images showing font samples
- Detect variable fonts and their axes
- Extract Unicode range information
- Integrate with the MediaIngestService and AssetManager
- Auto-detect font format from file content (not just extension)
- Visual previews with metrics, character sets, and variable font information

## Usage

1. Install dependencies:
   ```
   npm install fontkit canvas
   ```

2. Register the discovery implementation:
   ```typescript
   import { mediaDiscoveryRegistry } from './media/ingest';
   import { FontkitMediaDiscovery } from './media/ingest/implementations/FontkitMediaDiscovery';

   const fontDiscovery = new FontkitMediaDiscovery();
   mediaDiscoveryRegistry.register(fontDiscovery);
   ```

3. Use it with the media ingest service:
   ```typescript
   const fontPath = path.resolve(process.cwd(), 'fonts/my-font.ttf');
   const result = await mediaIngest.ingestFile<FontAsset>(fontPath, {
     path: fontPath,
     generateId: true,
     extractTags: true
   });

   if (result.success && result.asset) {
     console.log(`Font family: ${result.asset.family}`);
     console.log(`Font weight: ${result.asset.weight}`);
     console.log(`Font style: ${result.asset.style}`);
     console.log(`Variable font: ${result.asset.isVariable ? 'Yes' : 'No'}`);
     console.log(`Preview: ${result.asset.previewImagePath}`);
   }
   ```

## Preview Generation

The implementation generates SVG previews showing:
- A sample text in the font
- Character set (uppercase, lowercase, numbers, special characters)
- Size samples at different font sizes
- Font metrics information
- Variable font axes (if applicable)

## Enhanced Features

### Font Format Detection

Instead of relying solely on file extensions, FontkitMediaDiscovery can detect font formats from file content by examining signature bytes:

- TTF: Checks for signature `0x00 0x01 0x00 0x00`
- OTF: Checks for signature `OTTO`
- WOFF: Checks for signature `wOFF`
- WOFF2: Checks for signature `wOF2`

This allows for correct handling of fonts even if they have incorrect or missing file extensions.

### Visual Previews

The SVG previews now include:

- Styled boxes around sample text and character sets
- Font information in a structured layout
- Variable font axes display (when applicable)
- Different font sizes shown in a clear format
- Font metrics with proper labeling

### Dependency Management

The implementation now checks for required dependencies and provides helpful messages if they're missing. It can also install missing dependencies if needed:

```typescript
// Install dependencies if needed
await FontkitMediaDiscovery.installDependencies();
```

## Dependencies

- [Fontkit](https://github.com/foliojs/fontkit): Font parsing library
- [Canvas](https://github.com/Automattic/node-canvas): Graphics API for Node.js

## Testing

To test the implementation, run:
```
npm run test:font-discovery
```

This will try to analyze a sample font and output the extracted metadata.

