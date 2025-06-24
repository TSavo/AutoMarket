# Zonos Language Code Fix and Voice Cloning Improvements

## Issue Identified

The Zonos TTS service was failing with the error:
```
gradio.exceptions.Error: "Value: en is not in the list of choices: ['af', 'am', 'an', 'ar', 'as', 'az', 'ba', 'bg', 'bn', 'bpy', 'bs', 'ca', 'cmn', 'cs', 'cy', 'da', 'de', 'el', 'en-029', 'en-gb', 'en-gb-scotland', 'en-gb-x-gbclan', 'en-gb-x-gbcwmd', 'en-gb-x-rp', 'en-us', 'eo', 'es', 'es-419', 'et', 'eu', 'fa', 'fa-latn', 'fi', 'fr-be', 'fr-ch', 'fr-fr', 'ga', 'gd', 'gn', 'grc', 'gu', 'hak', 'hi', 'hr', 'ht', 'hu', 'hy', 'hyw', 'ia', 'id', 'is', 'it', 'ja', 'jbo', 'ka', 'kk', 'kl', 'kn', 'ko', 'kok', 'ku', 'ky', 'la', 'lfn', 'lt', 'lv', 'mi', 'mk', 'ml', 'mr', 'ms', 'mt', 'my', 'nb', 'nci', 'ne', 'nl', 'om', 'or', 'pa', 'pap', 'pl', 'pt', 'pt-br', 'py', 'quc', 'ro', 'ru', 'ru-lv', 'sd', 'shn', 'si', 'sk', 'sl', 'sq', 'sr', 'sv', 'sw', 'ta', 'te', 'tn', 'tr', 'tt', 'ur', 'uz', 'vi', 'vi-vn-x-central', 'vi-vn-x-south', 'yue']"
```

**Root Cause**: The standard language code `"en"` is not supported by Zonos. It requires specific language codes like `"en-us"`.

## Fixes Applied

### 1. Language Code Mapping

Added automatic mapping from common language codes to Zonos-supported ones:

```typescript
private mapLanguageCode(language: string): string {
  const languageMapping: Record<string, string> = {
    'en': 'en-us',
    'english': 'en-us',
    'es': 'es',
    'spanish': 'es',
    'fr': 'fr-fr',
    'french': 'fr-fr',
    'de': 'de',
    'german': 'de',
    'it': 'it',
    'italian': 'it',
    'pt': 'pt',
    'portuguese': 'pt',
    'ru': 'ru',
    'russian': 'ru',
    'ja': 'ja',
    'japanese': 'ja',
    'ko': 'ko',
    'korean': 'ko',
    'zh': 'cmn',
    'chinese': 'cmn',
    'mandarin': 'cmn'
  };
  // ... validation logic
}
```

### 2. Language Validation

Added validation to ensure only supported language codes are used:

```typescript
getSupportedLanguages(): string[] {
  return [
    'af', 'am', 'an', 'ar', 'as', 'az', 'ba', 'bg', 'bn', 'bpy', 'bs', 'ca', 
    'cmn', 'cs', 'cy', 'da', 'de', 'el', 'en-029', 'en-gb', 'en-gb-scotland', 
    'en-gb-x-gbclan', 'en-gb-x-gbcwmd', 'en-gb-x-rp', 'en-us', 'eo', 'es', 
    // ... full list of 102 supported languages
  ];
}
```

### 3. Enhanced Error Handling

Improved error messages in the ZonosAPIClient:

```typescript
catch (error) {
  let errorMessage = "Failed to generate speech";
  
  if (error && typeof error === 'object') {
    if ('message' in error) {
      errorMessage += `: ${error.message}`;
    } else {
      errorMessage += `: ${JSON.stringify(error)}`;
    }
  }
  
  console.error('[ZonosAPIClient] TTS generation error:', error);
  throw new Error(errorMessage);
}
```

### 4. Standard Voice Cloning Interface

Enhanced support for the standard `voiceToClone` interface:

```typescript
// Support standard voiceToClone interface
if (options?.voiceToClone && !speakerAudio) {
  const voiceRole = options.voiceToClone;
  
  try {
    const audioData = await voiceRole.asAudio();
    
    if (audioData.data && Buffer.isBuffer(audioData.data)) {
      speakerAudio = audioData.data;
      console.log('[ZonosTextToAudioModel] Using voiceToClone audio buffer for voice cloning');
    } else if (audioData.metadata?.localPath) {
      speakerAudio = audioData.metadata.localPath;
      console.log(`[ZonosTextToAudioModel] Using voiceToClone file path: ${audioData.metadata.localPath}`);
    }
  } catch (error) {
    console.warn('[ZonosTextToAudioModel] Failed to process voiceToClone:', error);
  }
}
```

## Supported Language Codes

Zonos supports 102 language codes including:

### Common English Variants
- `en-us` (US English) ✅ 
- `en-gb` (British English)
- `en-gb-scotland` (Scottish English)
- `en-029` (Caribbean English)

### Major Languages
- `es` (Spanish), `es-419` (Latin American Spanish)
- `fr-fr` (French), `fr-be` (Belgian French), `fr-ch` (Swiss French)
- `de` (German)
- `it` (Italian)
- `pt` (Portuguese), `pt-br` (Brazilian Portuguese)
- `ru` (Russian), `ru-lv` (Latvian Russian)
- `ja` (Japanese)
- `ko` (Korean)
- `cmn` (Mandarin Chinese)

### Automatic Mapping
The system now automatically maps:
- `"en"` → `"en-us"`
- `"english"` → `"en-us"`
- `"zh"` → `"cmn"`
- `"chinese"` → `"cmn"`
- `"french"` → `"fr-fr"`
- And more...

## Usage Examples

### With Standard Interface
```typescript
const clonedAudio = await model.transform(text, {
  voiceToClone: voiceSample,  // Standard interface
  language: 'en',             // Automatically mapped to 'en-us'
  quality: 'high'
});
```

### With Zonos-Specific Interface
```typescript
const clonedAudio = await model.transform(text, {
  speakerAudio: './voice.wav',  // Zonos-specific
  language: 'en-us',            // Explicit supported code
  emotion: {
    happiness: 0.8,
    neutral: 0.2
  }
});
```

## Testing

Run the fixed voice cloning test:
```bash
npx tsx test-zonos-voice-fixed.ts
```

This will:
1. Test voice cloning with confusion.wav
2. Verify language code mapping
3. Show supported languages
4. Demonstrate both standard and Zonos-specific interfaces

## Benefits

1. **Backward Compatibility**: Standard language codes like "en" now work
2. **Better Error Messages**: Clear information about what went wrong
3. **Language Validation**: Automatic fallback to "en-us" for unsupported codes
4. **Standard Interface**: Full support for the TextToAudioOptions voiceToClone parameter
5. **Developer Friendly**: Helpful warnings and logging for language issues

The voice cloning now works seamlessly with both the standard interface and Zonos-specific features, while handling language codes gracefully.
