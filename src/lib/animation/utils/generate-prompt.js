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
You are an expert at creating prompts for AI video generation. I need you to create a detailed prompt for animating a portrait of a character from a cyberpunk story called "Horizon City".

Here is information about the character:

${context}

Based on this information, create a detailed prompt for animating this character's portrait. The prompt should:
1. Describe subtle, realistic movements and expressions that would make the portrait come alive
2. Focus on facial expressions, slight head movements, and perhaps minimal upper body movement
3. Include appropriate lighting effects and background elements that match the character's personality
4. Be specific about the mood and atmosphere
5. Be 2-3 sentences long, concise but detailed
6. NOT include any camera movements or zooming effects
7. Focus on making the character look photorealistic and lifelike

Your response should ONLY include the prompt text, nothing else. Do not include any explanations, introductions, or notes.
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
    
    // Remove any markdown formatting or quotes if present
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
    
    // Save the prompt to a file
    const outputPath = path.join(path.dirname(filePath), `${characterData.slug}-prompt.txt`);
    fs.writeFileSync(outputPath, animationPrompt);
    console.log(`Prompt saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
main();
