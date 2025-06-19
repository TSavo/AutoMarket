# Video Composition API

## Endpoint: POST /video/compose

Compose two videos together using custom FFmpeg filter complex strings. This provides maximum flexibility for video composition operations.

### Request Format

**Content-Type:** `multipart/form-data`

#### Required Fields

- `video1`: First video file (File) - input [0:v]
- `video2`: Second video file (File) - input [1:v]
- `filterComplex`: Custom FFmpeg filter complex string (string)

#### Optional Fields

- `outputFormat`: Output video format (string, default: `mp4`)
  - Supported: `mp4`, `avi`, `mov`, `mkv`, `webm`

- `codec`: Video codec (string, default: `libx264`)

- `bitrate`: Video bitrate (string, e.g., "2000k")

- `resolution`: Output resolution (string, e.g., "1920x1080")

- `fps`: Frame rate (number)

### Filter Complex Examples

The `filterComplex` parameter should be a valid FFmpeg filter graph that takes `[0:v]` (video1) and `[1:v]` (video2) as inputs and produces an `[output]` stream.

#### Simple Overlay with Transparency
```
[1:v]scale=640:360[overlay];[0:v][overlay]overlay=10:10:alpha=straight[output]
```

#### Timed Overlay (appears after 5 seconds for 10 seconds)
```
[1:v]scale=640:360[overlay];[0:v][overlay]overlay=10:10:enable='between(t,5,15)':alpha=straight[output]
```

#### Side-by-Side Layout
```
[0:v]scale=960:1080[left];[1:v]scale=960:1080[right];[left][right]hstack=inputs=2[output]
```

#### Picture-in-Picture
```
[1:v]scale=320:240[pip];[0:v][pip]overlay=W-w-20:20:alpha=straight[output]
```

### Response Format

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "outputPath": "/outputs/composed_uuid.mp4",
    "filename": "composed_uuid.mp4",
    "format": "mp4",
    "metadata": {
      "duration": 30.5,
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "size": 15728640,
      "bitrate": "2000000",
      "codec": "h264"
    },
    "processingTime": 5000
  },
  "message": "Videos composed successfully",
  "timestamp": "2025-06-17T10:30:00.000Z"
}
```

#### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message",
  "message": "Request failed",
  "timestamp": "2025-06-17T10:30:00.000Z"
}
```

### Example Usage

#### cURL Example

```bash
curl -X POST http://localhost:8006/video/compose \
  -F "video1=@path/to/first-video.mp4" \
  -F "video2=@path/to/second-video.mp4" \
  -F "layout=side-by-side" \
  -F "outputFormat=mp4" \
  -F "gap=20"
```

#### JavaScript Example

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('video1', fs.createReadStream('first-video.mp4'));
form.append('video2', fs.createReadStream('second-video.mp4'));
form.append('layout', 'picture-in-picture');
form.append('pipPosition', 'bottom-right');
form.append('pipScale', '0.3');

const response = await fetch('http://localhost:8006/video/compose', {
  method: 'POST',
  body: form
});

const result = await response.json();
console.log(result);
```

### Layout Examples

#### 1. Side-by-side
Videos are scaled to the same height and placed horizontally next to each other.

```json
{
  "layout": "side-by-side",
  "gap": 10
}
```

#### 2. Top-bottom
Videos are scaled to the same width and stacked vertically.

```json
{
  "layout": "top-bottom",
  "gap": 5
}
```

#### 3. Overlay
Second video is overlaid on top of the first video at a specified position.

```json
{
  "layout": "overlay",
  "overlayPosition": "top-right",
  "overlayScale": 0.3,
  "overlayOpacity": 0.8
}
```

#### 4. Picture-in-picture
Second video appears as a small window in a corner of the first video.

```json
{
  "layout": "picture-in-picture",
  "pipPosition": "bottom-right",
  "pipScale": 0.25,
  "pipMargin": 20
}
```

### Error Handling

The endpoint validates input files and parameters, returning appropriate error messages for:

- Missing required video files
- Unsupported video formats
- Invalid parameter values
- FFmpeg processing errors
- File system errors

All temporary files are automatically cleaned up after processing, whether successful or failed.

### Performance Notes

- Processing time depends on video length, resolution, and complexity
- Larger videos and higher resolutions require more processing time
- The service supports concurrent requests
- Output files are served from the `/outputs` directory
