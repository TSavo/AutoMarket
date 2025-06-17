/**
 * Test script for the text sanitizer utility
 * 
 * Usage: ts-node test-text-sanitizer.ts [blog-slug]
 */

import fs from 'fs';
import path from 'path';
import { sanitizeForTTS, sanitizeBlogPostFile } from './text-sanitizer';

// Configuration
const BLOG_POSTS_PATH = path.join(__dirname, '../../content/blog/posts');

/**
 * Test the sanitizer with a specific blog post
 */
function testBlogPost(slug: string) {
  console.log(`\n=== Testing Text Sanitizer with: ${slug} ===\n`);

  // Find the blog post file
  const possiblePaths = [
    path.join(BLOG_POSTS_PATH, `${slug}.mdx`),
    path.join(BLOG_POSTS_PATH, `${slug}.md`)
  ];

  let filePath: string | null = null;
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      filePath = testPath;
      break;
    }
  }

  if (!filePath) {
    console.error(`❌ Blog post not found: ${slug}`);
    console.log('Available posts:');
    const files = fs.readdirSync(BLOG_POSTS_PATH);
    files.filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
         .slice(0, 10)
         .forEach(f => console.log(`  - ${path.basename(f, path.extname(f))}`));
    return;
  }

  console.log(`Found blog post: ${filePath}`);

  try {
    // Test with different options
    const options = [
      {
        name: 'Default Options',
        options: {}
      },
      {
        name: 'Full Script (with title and intro)',
        options: {
          includeTitle: true,
          includeIntroduction: true,
          preserveGreetings: true,
          preserveSignature: true
        }
      },
      {
        name: 'Clean Script (no greetings/signatures)',
        options: {
          includeTitle: true,
          preserveGreetings: false,
          preserveSignature: false,
          addSeriesOutro: true,
          addPauses: true
        }
      },
      {
        name: 'TTS Ready (preserve style, clean ending)',
        options: {
          includeTitle: true,
          preserveGreetings: true,
          preserveSignature: false,
          addSeriesOutro: true,
          addPauses: true
        }
      },
      {
        name: 'Short Version (max 1000 chars)',
        options: {
          includeTitle: true,
          maxLength: 1000,
          addPauses: false
        }
      }
    ];

    for (const test of options) {
      console.log(`\n--- ${test.name} ---`);
      
      const result = sanitizeBlogPostFile(filePath, test.options);
      
      console.log(`Title: ${result.title}`);
      console.log(`Word Count: ${result.wordCount}`);
      console.log(`Estimated Duration: ${Math.floor(result.estimatedDuration / 60)}:${(result.estimatedDuration % 60).toString().padStart(2, '0')}`);
      console.log(`Character Count: ${result.cleanText.length}`);
      
      // Show first 300 characters of cleaned text
      const preview = result.cleanText.substring(0, 300);
      console.log(`\nPreview:\n"${preview}${result.cleanText.length > 300 ? '...' : ''}"`);
      
      // Show some statistics
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const compressionRatio = ((originalContent.length - result.cleanText.length) / originalContent.length * 100).toFixed(1);
      console.log(`\nCompression: ${compressionRatio}% reduction from original`);
    }

  } catch (error) {
    console.error(`❌ Error processing blog post:`, error);
  }
}

/**
 * Test with sample MDX content
 */
function testSampleContent() {
  console.log(`\n=== Testing with Sample Content ===\n`);

  const sampleMDX = `---
title: 'Test Blog Post: The Future of AI'
description: 'A test post about artificial intelligence'
date: '2025-05-30'
author: T Savo
---

# Test Blog Post: The Future of AI

## Introduction

Hey chummer,

This is a **test blog post** with various [markdown formatting](https://example.com) and special elements.

!hover[Sample Image](/images/test.png)(/videos/test.mp4)

### Key Points

1. **Bold text** and *italic text*
2. Links like [OpenAI](https://openai.com) and [Google](https://google.com)
3. \`Inline code\` and code blocks:

\`\`\`javascript
console.log("Hello world");
\`\`\`

> This is a blockquote with important information.

The future is here, and it's both exciting and terrifying. We need to be prepared for what's coming.

Walk safe through the digital wasteland, chummer. The corps are watching.

-T

Sources:
- [AI Research Paper](https://example.com/paper)
- [Tech News](https://example.com/news)`;

  const result = sanitizeForTTS(sampleMDX, {
    includeTitle: true,
    preserveGreetings: false,
    cleanupSignature: true,
    addPauses: true
  });

  console.log(`Title: ${result.title}`);
  console.log(`Word Count: ${result.wordCount}`);
  console.log(`Estimated Duration: ${result.estimatedDuration} seconds`);
  console.log(`\nCleaned Text:\n"${result.cleanText}"`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Testing text sanitizer with sample content...');
    testSampleContent();
    
    console.log('\n' + '='.repeat(60));
    console.log('To test with a specific blog post, use:');
    console.log('ts-node test-text-sanitizer.ts <blog-slug>');
    console.log('\nExample:');
    console.log('ts-node test-text-sanitizer.ts neural-heist');
    
    return;
  }

  const slug = args[0];
  testBlogPost(slug);
}

// Run the test
main();
