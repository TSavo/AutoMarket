const fs = require('fs');
const path = require('path');

// List of files that need updating
const filesToUpdate = [
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\together\\TogetherTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\together\\TogetherTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\replicate\\ReplicateTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\replicate\\ReplicateTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\replicate\\ReplicateTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\openai\\OpenAITextToImageModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\openai\\OpenAITextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\falai\\FalTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\falai\\FalTextToImageModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\falai\\FalTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\elevenlabs\\ElevenLabsTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\zonos\\ZonosTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\kokoro\\KokoroDockerModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\huggingface\\HuggingFaceTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\huggingface\\HuggingFaceDockerModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\chatterbox\\ChatterboxDockerModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\docker\\chatterbox\\ChatterboxTextToAudioModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\creatify\\CreatifyTextToVideoModel.ts',
  'c:\\Users\\T\\Projects\\AutoMarket\\src\\media\\providers\\creatify\\CreatifyTextToAudioModel.ts'
];

function fixTextImports(content) {
  // Fix imports that need Text class but don't have it
  if (!content.includes(', Text') && content.includes('Text.fromString')) {
    // Add Text to existing role imports
    content = content.replace(
      /import \{ ([^}]*), TextRole([^}]*) \} from '([^']*\/assets\/roles)'/g,
      "import { $1, TextRole, Text$2 } from '$3'"
    );
    
    // If no existing role imports, add a new import
    if (!content.includes('Text')) {
      const roleImportMatch = content.match(/import \{ ([^}]*) \} from '([^']*\/assets\/roles)'/);
      if (roleImportMatch) {
        content = content.replace(
          /import \{ ([^}]*) \} from '([^']*\/assets\/roles)'/,
          "import { $1, Text } from '$2'"
        );
      }
    }
  }
  
  return content;
}

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update imports to include extractInputContent
    content = content.replace(
      /import { createGenerationPrompt } from/g,
      'import { createGenerationPrompt, extractInputContent } from'
    );
    
    // Fix Text imports
    content = fixTextImports(content);
    
    // Update the transform logic pattern - more comprehensive patterns
    const patterns = [
      // Pattern 1: Basic inputRole pattern
      {
        search: /(\s+)const text = await inputRole\.asText\(\);/g,
        replace: `$1// Handle both TextRole and string inputs
$1let text: Text;
$1if (typeof inputRole === 'string') {
$1  text = Text.fromString(inputRole);
$1} else {
$1  text = await inputRole.asText();
$1}`
      },
      // Pattern 2: Basic role pattern
      {
        search: /(\s+)const text = await role\.asText\(\);/g,
        replace: `$1// Handle both TextRole and string inputs
$1let text: Text;
$1if (typeof role === 'string') {
$1  text = Text.fromString(role);
$1} else {
$1  text = await role.asText();
$1}`
      }
    ];
    
    patterns.forEach(pattern => {
      content = content.replace(pattern.search, pattern.replace);
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
  }
}

// Update all files
filesToUpdate.forEach(updateFile);
console.log('Update complete!');
