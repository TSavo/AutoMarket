const fs = require('fs');

// List of all files that might need Text import fixes
const filesToCheck = [
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\together\\TogetherTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\together\\TogetherTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\replicate\\ReplicateTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\replicate\\ReplicateTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\replicate\\ReplicateTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\openai\\OpenAITextToImageModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\openai\\OpenAITextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\falai\\FalTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\falai\\FalTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\falai\\FalTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\elevenlabs\\ElevenLabsTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\zonos\\ZonosTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\kokoro\\KokoroDockerModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\huggingface\\HuggingFaceTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\huggingface\\HuggingFaceDockerModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\chatterbox\\ChatterboxDockerModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\docker\\chatterbox\\ChatterboxTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\creatify\\CreatifyTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\Prizm\\src\\media\\providers\\creatify\\CreatifyTextToAudioModel.ts'
];

function fixTextImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file uses Text.fromString but doesn't import Text
    if (content.includes('Text.fromString') && !content.includes(', Text')) {
      
      // Pattern 1: Add Text to existing asset role imports
      const patterns = [
        // For imports like: import { Audio, TextRole } from '../../assets/roles';
        {
          search: /import \{ ([^}]*), TextRole([^}]*) \} from '([^']*\/assets\/roles)'/g,
          replace: "import { $1, TextRole, Text$2 } from '$3'"
        },
        // For imports like: import { Audio, TextRole, AudioRole } from '../../assets/roles';
        {
          search: /import \{ ([^}]*), TextRole, AudioRole([^}]*) \} from '([^']*\/assets\/roles)'/g,
          replace: "import { $1, TextRole, AudioRole, Text$2 } from '$3'"
        },
        // For imports like: import { Image, TextRole } from '../../assets/roles';
        {
          search: /import \{ Image, TextRole \} from '([^']*\/assets\/roles)'/g,
          replace: "import { Image, TextRole, Text } from '$1'"
        },
        // For imports like: import { Audio, TextRole, AudioRole } from '../../assets/roles';
        {
          search: /import \{ Audio, TextRole, AudioRole \} from '([^']*\/assets\/roles)'/g,
          replace: "import { Audio, TextRole, AudioRole, Text } from '$1'"
        }
      ];
      
      let updated = false;
      patterns.forEach(pattern => {
        if (pattern.search.test(content)) {
          content = content.replace(pattern.search, pattern.replace);
          updated = true;
        }
      });
      
      if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed Text import in: ${filePath}`);
      } else {
        console.log(`Could not automatically fix Text import in: ${filePath}`);
      }
    } else {
      console.log(`No Text import fix needed for: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

// Fix all files
filesToCheck.forEach(fixTextImports);
console.log('Text import fixes complete!');
