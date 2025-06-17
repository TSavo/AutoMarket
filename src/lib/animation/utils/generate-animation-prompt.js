const fs = require('fs');
const path = require('path');
const axios = require('axios');
const matter = require('gray-matter');

// Configuration
const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL = 'deepseek-r1:7b';

/**
 * Generate an animation prompt using Ollama
 */
async function generateAnimationPrompt(characterData) {
  // Create a context for the model with relevant character information
  const context = `
Character Name: ${characterData.fullName || characterData.title}
Gender: ${characterData.gender || 'Unknown'}
Age: ${characterData.age || 'Unknown'}
Occupation: ${Array.isArray(characterData.occupation) ? characterData.occupation.join(', ') : characterData.occupation || 'Unknown'}
Archetype: ${characterData.archetype ? `${characterData.archetype.type} - ${characterData.archetype.description}` : 'Unknown'}
Physical Description: ${Array.isArray(characterData.physicalDescription) ? characterData.physicalDescription.join('. ') : characterData.physicalDescription || 'Unknown'}
Species: ${characterData.species || 'Human'}
Modifications: ${Array.isArray(characterData.modifications) ? characterData.modifications.join('. ') : characterData.modifications || 'None'}
Status: ${characterData.status || 'Unknown'}
  `.trim();

  // Create the prompt for the model
  const prompt = `
I have a still portrait image of a character from a cyberpunk story called "Horizon City". I want to use FramePack AI to add subtle animation to this EXISTING portrait.

Here is information about the character:

${context}

Write a prompt for FramePack that describes ONLY the subtle movements and expressions the character should make in the animated portrait. The prompt should:

1. Begin with something like "The character blinks slowly..." or "The character's expression shifts slightly..."
2. Focus ONLY on facial movements like blinking, slight smiles, subtle frowns, or small head tilts
3. Be 1-2 sentences long and very specific about the facial movements
4. NOT include any body movements below the shoulders
5. NOT include any camera movements, zooming, or panning
6. NOT suggest creating a new image or changing the existing portrait
7. Match the character's personality

IMPORTANT: Your response should ONLY be the animation prompt. Do not include any explanations, introductions, or notes.
  `.trim();

  try {
    console.log('Sending request to Ollama...');
    // Call the Ollama API
    const response = await axios.post(OLLAMA_ENDPOINT, {
      model: MODEL,
      prompt: prompt,
      stream: false
    });

    // Extract and clean the response
    let generatedPrompt = response.data.response.trim();

    // Remove any thinking process sections
    generatedPrompt = generatedPrompt.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Remove any markdown formatting or quotes
    generatedPrompt = generatedPrompt.replace(/^```.*$/gm, '').trim();
    generatedPrompt = generatedPrompt.replace(/^"(.*)"$/gm, '$1').trim();

    return generatedPrompt;
  } catch (error) {
    console.error('Error generating prompt with Ollama:', error);
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return `Error generating prompt: ${error.message}`;
  }
}

/**
 * Read a character markdown file and extract its data
 */
function readCharacterFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    ...data,
    content: content.trim()
  };
}

/**
 * Main function
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Please provide a path to a character markdown file');
    process.exit(1);
  }

  const filePath = args[0];

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    console.log(`Reading character file: ${filePath}`);
    const characterData = readCharacterFile(filePath);

    console.log(`Generating animation prompt for ${characterData.title || characterData.fullName}...`);
    const animationPrompt = await generateAnimationPrompt(characterData);

    console.log('\nGenerated Animation Prompt:');
    console.log('==========================');
    console.log(animationPrompt);
    console.log('==========================');

    // Create output directory if it doesn't exist
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output', { recursive: true });
    }

    // Save the prompt to a file
    const outputPath = `./output/${characterData.slug}-prompt.txt`;
    fs.writeFileSync(outputPath, animationPrompt);
    console.log(`Prompt saved to: ${outputPath}`);

    // Also save a JSON file with all the information needed for animation
    const portraitPath = path.resolve(`../horizon-city-stories/public/images/characters/${characterData.slug}-portrait.png`);
    const outputVideoPath = path.resolve(`../horizon-city-stories/public/videos/characters/${characterData.slug}-animated.mp4`);
    const characterFilePath = path.resolve(`../horizon-city-stories/content/characters/${characterData.slug}.md`);

    const animationData = {
      characterName: characterData.fullName || characterData.title,
      slug: characterData.slug,
      portraitPath: portraitPath,
      animationPrompt: animationPrompt,
      outputVideoPath: outputVideoPath,
      characterFilePath: characterFilePath
    };

    const jsonOutputPath = `./output/${characterData.slug}-animation.json`;
    fs.writeFileSync(jsonOutputPath, JSON.stringify(animationData, null, 2));
    console.log(`Animation data saved to: ${jsonOutputPath}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main();
