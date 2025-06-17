# PngMediaDiscovery

A PNG metadata discovery implementation for the Media Ingest system using the exifr library.

## Features

- Extract metadata from PNG files
- Verify PNG file signatures
- Extract dimensions and other PNG-specific metadata
- Integrate with the MediaIngestService and AssetManager
- Auto-detect PNG format from file content (not just extension)

## Usage

1. Install dependencies:
   ```
   npm install exifr
   ```

2. Register the discovery implementation:
   ```typescript
   import { mediaDiscoveryRegistry } from './media/ingest';
   import { PngMediaDiscovery } from './media/ingest/implementations/PngMediaDiscovery';

   const pngDiscovery = new PngMediaDiscovery();
   mediaDiscoveryRegistry.register(pngDiscovery);
   ```

3. Use it with the media ingest service:
   ```typescript
   const pngPath = path.resolve(process.cwd(), 'images/my-image.png');
   const result = await mediaIngestService.ingestFile<ImageAsset>(pngPath, {
     path: pngPath,
     generateId: true,
     extractTags: true
   });

   if (result.success && result.asset) {
     console.log(`Image dimensions: ${result.asset.width}x${result.asset.height}`);
     console.log(`Color type: ${result.asset.colorSpace}`);
     console.log(`Bit depth: ${result.asset.bitDepth}`);
   }
   ```

## Metadata Extraction

The implementation extracts the following metadata from PNG files:

- Dimensions (width and height)
- Bit depth
- Color type
- Compression method
- Filter method
- Interlace method

## PNG Format Detection

Instead of relying solely on file extensions, PngMediaDiscovery can detect PNG format from file content by examining the PNG signature bytes:

- PNG: Checks for signature `89 50 4E 47 0D 0A 1A 0A`

This allows for correct handling of PNG files even if they have incorrect or missing file extensions.

## Integration with exifr

The implementation uses the exifr library to extract metadata from PNG files. exifr is a fast and versatile JavaScript EXIF reading library that supports various file formats including PNG.

## Testing

You can test the PNG discovery implementation using the provided test script:

```
node scripts/test-png-discovery.js [path-to-png-file]
```

This script will verify the PNG signature, extract dimensions, and attempt to extract metadata using exifr.
