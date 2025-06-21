/**
 * Fix Import Paths Script
 * 
 * Updates import paths in reorganized model files
 */

import * as fs from 'fs';
import * as path from 'path';

const modelsDir = 'c:/Users/T/Projects/AutoMarket/src/media/models';

// Define path mappings for different file locations
const pathMappings = {
  // For files in providers/replicate/
  'providers/replicate': {
    './Model': '../../abstracts/Model',
    './TextToImageModel': '../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../abstracts/VideoToVideoModel',
    '../assets/': '../../../assets/',
    '../clients/': '../../../clients/',
    '../services/': '../../../services/',
    '../types/': '../../../types/'
  },
  // For files in providers/together/
  'providers/together': {
    './Model': '../../abstracts/Model',
    './TextToImageModel': '../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../abstracts/VideoToVideoModel',
    '../assets/': '../../../assets/',
    '../clients/': '../../../clients/',
    '../services/': '../../../services/',
    '../types/': '../../../types/'
  },
  // For files in providers/openrouter/
  'providers/openrouter': {
    './Model': '../../abstracts/Model',
    './TextToImageModel': '../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../abstracts/VideoToVideoModel',
    '../assets/': '../../../assets/',
    '../clients/': '../../../clients/',
    '../services/': '../../../services/',
    '../types/': '../../../types/'
  },
  // For files in providers/docker/chatterbox/
  'providers/docker/chatterbox': {
    './Model': '../../../abstracts/Model',
    './TextToImageModel': '../../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../../abstracts/VideoToVideoModel',
    '../assets/': '../../../../assets/',
    '../clients/': '../../../../clients/',
    '../services/': '../../../../services/',
    '../types/': '../../../../types/'
  },
  // For files in providers/docker/whisper/
  'providers/docker/whisper': {
    './Model': '../../../abstracts/Model',
    './TextToImageModel': '../../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../../abstracts/VideoToVideoModel',
    '../assets/': '../../../../assets/',
    '../clients/': '../../../../clients/',
    '../services/': '../../../../services/',
    '../types/': '../../../../types/'
  },
  // For files in providers/docker/ffmpeg/
  'providers/docker/ffmpeg': {
    './Model': '../../../abstracts/Model',
    './TextToImageModel': '../../../abstracts/TextToImageModel',
    './TextToAudioModel': '../../../abstracts/TextToAudioModel',
    './TextToVideoModel': '../../../abstracts/TextToVideoModel',
    './TextToTextModel': '../../../abstracts/TextToTextModel',
    './AudioToTextModel': '../../../abstracts/AudioToTextModel',
    './ImageToVideoModel': '../../../abstracts/ImageToVideoModel',
    './VideoToAudioModel': '../../../abstracts/VideoToAudioModel',
    './VideoToVideoModel': '../../../abstracts/VideoToVideoModel',
    '../assets/': '../../../../assets/',
    '../clients/': '../../../../clients/',
    '../services/': '../../../../services/',
    '../types/': '../../../../types/'
  },
  // For files in abstracts/
  'abstracts': {
    '../assets/': '../../assets/',
    '../clients/': '../../clients/',
    '../services/': '../../services/',
    '../types/': '../../types/'
  }
};

function fixImportsInFile(filePath: string, relativePath: string) {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  
  // Determine which path mapping to use based on file location
  let mappings: any = {};
  for (const [key, mapping] of Object.entries(pathMappings)) {
    if (relativePath.startsWith(key)) {
      mappings = mapping;
      break;
    }
  }
  
  // Apply path mappings
  for (const [oldPath, newPath] of Object.entries(mappings)) {
    const regex = new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    updatedContent = updatedContent.replace(regex, `from '${newPath}`);
    
    const regexImport = new RegExp(`import.*['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    updatedContent = updatedContent.replace(regexImport, (match) => match.replace(oldPath, newPath as string));
  }
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Fixed imports in: ${relativePath}`);
  }
}

function processDirectory(dir: string, baseDir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      processDirectory(fullPath, baseDir);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      fixImportsInFile(fullPath, relativePath);
    }
  }
}

// Run the fix
processDirectory(modelsDir, modelsDir);
console.log('Import path fixes completed!');
