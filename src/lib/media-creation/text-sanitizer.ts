/**
 * Text Sanitization Utility for TTS Generation
 * 
 * This utility extracts clean text from MDX blog content and converts it
 * into a proper script suitable for text-to-speech generation.
 * 
 * Features:
 * - Removes markdown formatting (###, **, etc.)
 * - Converts links to readable format
 * - Handles special characters and formatting
 * - Removes image/video references
 * - Cleans up whitespace and line breaks
 * - Generates natural-sounding script for TTS
 */

import matter from 'gray-matter';

export interface SanitizedContent {
  title: string;
  cleanText: string;
  wordCount: number;
  estimatedDuration: number; // in seconds
}

export interface SanitizationOptions {
  includeTitle?: boolean;
  includeIntroduction?: boolean;
  preserveGreetings?: boolean; // Keep "Hey chummer" etc.
  cleanupSignature?: boolean; // Clean "-T" to "T" and remove everything after
  addSeriesOutro?: boolean; // Add "This post is part of..." outro
  maxLength?: number; // maximum characters
  addPauses?: boolean; // add natural pauses for TTS
}

/**
 * Main function to sanitize MDX content for TTS
 */
export function sanitizeForTTS(
  mdxContent: string, 
  options: SanitizationOptions = {}
): SanitizedContent {
  const {
    includeTitle = true,
    includeIntroduction = false,
    preserveGreetings = true,
    cleanupSignature = true,
    addSeriesOutro = true,
    maxLength = 50000,
    addPauses = true
  } = options;

  // Parse frontmatter
  const { data, content } = matter(mdxContent);
  const title = data.title || 'Untitled';

  // Start with the content body
  let cleanText = content;

  // Remove image and video references FIRST (before anything else corrupts the syntax)
  cleanText = removeMediaReferences(cleanText);

  // Remove frontmatter-style content if it leaked through
  cleanText = removeFrontmatterLeaks(cleanText);

  // Remove MDX-specific elements
  cleanText = removeMDXElements(cleanText);

  // Remove markdown formatting
  cleanText = removeMarkdownFormatting(cleanText);

  // Remove duplicate title if it appears at the beginning of content
  cleanText = removeDuplicateTitle(cleanText, title);

  // Convert links to readable format
  cleanText = convertLinksToReadable(cleanText);

  // Clean up special characters and formatting
  cleanText = cleanSpecialCharacters(cleanText);

  // Remove greetings if NOT preserving them
  if (!preserveGreetings) {
    cleanText = removeGreetingsFromText(cleanText);
  }

  // Clean up signature (remove dash and everything after T)
  if (cleanupSignature) {
    cleanText = removeSignatureFromText(cleanText);
  }

  // Clean up whitespace and normalize text
  cleanText = normalizeWhitespace(cleanText);

  // Add natural pauses for TTS if requested
  if (addPauses) {
    cleanText = addNaturalPauses(cleanText);
  }

  // Add series outro if requested
  if (addSeriesOutro) {
    cleanText = addSeriesOutroText(cleanText);
  }

  // Truncate if too long
  if (cleanText.length > maxLength) {
    cleanText = truncateText(cleanText, maxLength);
  }

  // Prepare final script
  let finalScript = '';
  
  if (includeTitle) {
    finalScript += `${title}.\n\n`;
  }

  if (includeIntroduction) {
    finalScript += `This is a blog post by T Savo.\n\n`;
  }

  finalScript += cleanText;

  // Calculate metrics
  const wordCount = countWords(finalScript);
  const estimatedDuration = estimateReadingTime(finalScript);

  return {
    title,
    cleanText: finalScript,
    wordCount,
    estimatedDuration
  };
}

/**
 * Remove any frontmatter that leaked into content
 */
function removeFrontmatterLeaks(text: string): string {
  // Remove any remaining --- blocks
  return text.replace(/^---[\s\S]*?---\s*/m, '');
}

/**
 * Remove MDX-specific elements
 */
function removeMDXElements(text: string): string {
  // Remove import statements
  text = text.replace(/^import\s+.*$/gm, '');
  
  // Remove export statements
  text = text.replace(/^export\s+.*$/gm, '');
  
  // Remove JSX components (basic removal)
  text = text.replace(/<[^>]+>/g, '');
  
  return text;
}

/**
 * Remove duplicate title if it appears at the beginning of content
 */
function removeDuplicateTitle(text: string, title: string): string {
  // Escape special regex characters in title
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Remove title if it appears at the very beginning (with optional whitespace)
  const titleRegex = new RegExp(`^\\s*${escapedTitle}\\s*`, 'i');
  text = text.replace(titleRegex, '');

  return text;
}

/**
 * Remove markdown formatting
 */
function removeMarkdownFormatting(text: string): string {
  // Remove headers completely for cleaner TTS flow
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '');

  // Remove bold and italic (**text** and *text*)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');

  // Remove strikethrough (~~text~~)
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove code blocks (```code```)
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code (`code`)
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove blockquotes (> text)
  text = text.replace(/^>\s*/gm, '');

  // Remove horizontal rules (--- or ***)
  text = text.replace(/^[-*]{3,}\s*$/gm, '');

  // Convert list items to natural speech with transitions
  // Handle numbered lists with natural transitions - improved to properly detect list boundaries
  text = convertNumberedListsToNaturalSpeech(text);

  // Handle bullet lists with natural transitions
  text = convertBulletListsToNaturalSpeech(text);

  return text;
}

/**
 * Convert markdown links to readable format
 */
function convertLinksToReadable(text: string): string {
  // Convert [text](url) to just the link text (URLs are not useful for TTS)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // Remove bare URLs entirely (they're not useful for TTS)
  text = text.replace(/https?:\/\/[^\s]+/g, '');

  return text;
}

/**
 * Remove image and video references
 */
function removeMediaReferences(text: string): string {
  // Remove !hover[...] syntax with any number of following parentheses/brace groups
  // This single regex handles: !hover[text](/path)(/path)({params}) and all variations
  text = text.replace(/!hover\[[^\]]*\](?:\([^)]*\)|\{[^}]*\})*/g, '');

  // Also remove corrupted !hover patterns (after brackets are stripped by cleanSpecialCharacters)
  // Pattern: !hovertext(path)(path)(params) - matches !hover followed by any text until whitespace
  text = text.replace(/!hover[^(\s]*(?:\([^)]*\)|\{[^}]*\})*/g, '');

  // Remove ![alt](src) image syntax
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // Remove HTML img tags
  text = text.replace(/<img[^>]*>/g, '');

  // Remove video references
  text = text.replace(/<video[^>]*>[\s\S]*?<\/video>/g, '');

  return text;
}

/**
 * Clean up special characters and formatting
 */
function cleanSpecialCharacters(text: string): string {
  // Replace smart quotes with regular quotes
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");
  
  // Replace em dashes and en dashes with regular dashes
  text = text.replace(/[—–]/g, '-');
  
  // Replace ellipsis character with three dots
  text = text.replace(/…/g, '...');
  
  // Remove or replace other special characters that might cause TTS issues
  text = text.replace(/[^\w\s.,!?;:()\-'"]/g, '');
  
  return text;
}

/**
 * Remove common greeting patterns
 */
function removeGreetingsFromText(text: string): string {
  // Remove "Hey chummer," and similar greetings
  text = text.replace(/^Hey\s+chummer,?\s*/im, '');
  text = text.replace(/^Hello[,\s]*/im, '');
  text = text.replace(/^Hi[,\s]*/im, '');

  return text;
}

/**
 * Clean up signature: remove dash from "-T" and delete everything after "T"
 */
function removeSignatureFromText(text: string): string {
  // Find "-T" and replace with "T", then remove everything after it
  const tSignatureIndex = text.indexOf('-T');
  if (tSignatureIndex !== -1) {
    // Keep everything up to and including "T", remove everything after
    text = text.substring(0, tSignatureIndex) + 'T';
  }

  return text;
}

/**
 * Normalize whitespace and clean up text
 */
function normalizeWhitespace(text: string): string {
  // Replace multiple newlines with double newlines (preserve paragraph breaks)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Replace multiple spaces with single spaces
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Trim whitespace from lines but preserve paragraph structure
  text = text.split('\n').map(line => line.trim()).join('\n');

  // Remove empty lines at start and end
  text = text.trim();

  return text;
}

/**
 * Add natural pauses for better TTS flow
 */
function addNaturalPauses(text: string): string {
  // Add slight pause after periods
  text = text.replace(/\.\s+/g, '. ');

  // Add pause after colons
  text = text.replace(/:\s+/g, ': ');

  // Add pause after semicolons
  text = text.replace(/;\s+/g, '; ');

  // Add longer pause after paragraph breaks
  text = text.replace(/\n\n/g, '\n\n');

  return text;
}

/**
 * Add series outro message
 */
function addSeriesOutroText(text: string): string {
  const outro = '\n\nThis post is part of the I Hate It Here series. For more like it, visit horizon dash city dot com';
  return text + outro;
}

/**
 * Truncate text intelligently at sentence boundaries
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last sentence boundary before maxLength
  const truncated = text.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  
  if (lastSentence > maxLength * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }
  
  // If no good sentence boundary, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

/**
 * Estimate reading time in seconds (average 150 words per minute for TTS)
 */
function estimateReadingTime(text: string): number {
  const wordCount = countWords(text);
  const wordsPerMinute = 150; // Typical TTS speed
  return Math.ceil((wordCount / wordsPerMinute) * 60);
}

/**
 * Convert numbered lists to natural speech with proper list boundary detection
 */
function convertNumberedListsToNaturalSpeech(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let currentListNumber = 1;
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const numberedListMatch = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
    
    if (numberedListMatch) {
      const [, number, content] = numberedListMatch;
      const num = parseInt(number);
      
      // Check if this is the start of a new list (number 1) or continuation
      if (num === 1) {
        currentListNumber = 1;
        inList = true;
      } else if (!inList || num !== currentListNumber) {
        // If we weren't in a list or the number doesn't match expected sequence,
        // this might not be a real list item - treat as regular text
        result.push(line);
        continue;
      }
      
      // Convert to natural speech
      const transitions = [
        "First,", "Second,", "Third,", "Fourth,", "Fifth,",
        "Sixth,", "Seventh,", "Eighth,", "Ninth,", "Tenth,"
      ];
      
      let transition;
      if (currentListNumber <= transitions.length) {
        transition = transitions[currentListNumber - 1];
      } else {
        transition = "Next,";
      }
      
      result.push(`${transition} ${content}`);
      currentListNumber++;
    } else {
      // Not a numbered list item
      if (line.trim() === '') {
        // Empty line might separate lists
        inList = false;
      } else if (inList && line.trim() !== '') {
        // Non-empty line that's not a list item ends the current list
        inList = false;
      }
      
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Convert bullet lists to natural speech with varied transitions
 */
function convertBulletListsToNaturalSpeech(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let currentListItem = 0;
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletListMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
    
    if (bulletListMatch) {
      const [, content] = bulletListMatch;
      
      // If we weren't in a list, reset the counter
      if (!inList) {
        currentListItem = 0;
        inList = true;
      }
      
      // Use natural numbering transitions like numbered lists
      const transitions = [
        "First,", "Second,", "Third,", "Fourth,", "Fifth,",
        "Sixth,", "Seventh,", "Eighth,", "Ninth,", "Tenth,"
      ];
      
      let transition;
      if (currentListItem < transitions.length) {
        transition = transitions[currentListItem];
      } else {
        transition = "Next,";
      }
      
      result.push(`${transition} ${content}`);
      
      currentListItem++;
    } else {
      // Not a bullet list item
      if (line.trim() === '') {
        // Empty line might separate lists
        inList = false;
      } else if (inList && line.trim() !== '') {
        // Non-empty line that's not a list item ends the current list
        inList = false;
      }
      
      result.push(line);
    }
  }
  
  return result.join('\n');
}

/**
 * Utility function to sanitize a blog post file
 */
export function sanitizeBlogPostFile(
  filePath: string, 
  options: SanitizationOptions = {}
): SanitizedContent {
  const fs = require('fs');
  const content = fs.readFileSync(filePath, 'utf8');
  return sanitizeForTTS(content, options);
}
