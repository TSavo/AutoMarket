/**
 * Debug HTML Content Analysis
 * 
 * Let's examine the actual HTML content to see where parameters are defined
 */

import fetch from 'node-fetch';
import * as fs from 'fs';

async function debugFramePackHTML() {
  console.log('🔍 Debug Analysis of FramePack HTML');
  console.log('==================================');

  try {
    // Fetch the page
    const url = 'https://fal.ai/models/fal-ai/framepack';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await response.text();
    console.log(`✅ Page fetched: ${html.length} characters`);

    // Save raw HTML for inspection
    fs.writeFileSync('framepack-debug.html', html);
    console.log('✅ HTML saved to framepack-debug.html');

    // Look for specific patterns
    console.log('\n🔍 Looking for parameter patterns...');

    // Check for JavaScript that might contain parameter definitions
    const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    console.log(`Found ${scriptTags.length} script tags`);

    // Look for JSON that might contain parameters
    const jsonMatches = html.match(/\{[^{}]*"[^"]*"[^{}]*:[^{}]*\}/g) || [];
    console.log(`Found ${jsonMatches.length} JSON-like patterns`);

    // Look for specific parameter keywords with context
    const paramKeywords = ['prompt', 'image_url', 'num_frames', 'duration', 'guidance_scale'];
    
    for (const keyword of paramKeywords) {
      const regex = new RegExp(`.{50}${keyword}.{50}`, 'gi');
      const matches = html.match(regex) || [];
      if (matches.length > 0) {
        console.log(`\n📌 Context for "${keyword}":`);
        matches.forEach((match, i) => {
          if (i < 3) { // Show first 3 matches
            console.log(`   ${i + 1}: ...${match}...`);
          }
        });
      }
    }

    // Look for form inputs or API documentation
    const inputTags = html.match(/<input[^>]*>/gi) || [];
    const formTags = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
    console.log(`\nFound ${inputTags.length} input tags`);
    console.log(`Found ${formTags.length} form tags`);

    // Look for code blocks or pre-formatted text
    const codeBlocks = html.match(/<code[^>]*>[\s\S]*?<\/code>/gi) || [];    const preBlocks: string[] = html.match(/<pre[^>]*>[\s\S]*?<\/pre>/gi) || [];
    
    console.log(`\nFound ${codeBlocks.length} code blocks`);
    console.log(`Found ${preBlocks.length} pre blocks`);

    if (codeBlocks.length > 0) {
      console.log('\n📋 Code block content:');
      codeBlocks.forEach((block: string, i) => {
        console.log(`   Block ${i + 1}: ${block.substring(0, 200)}...`);
      });
    }

    if (preBlocks.length > 0) {
      console.log('\n📋 Pre block content:');
      preBlocks.forEach((block: string, i) => {
        console.log(`   Block ${i + 1}: ${block.substring(0, 200)}...`);
      });
    }

    // Look for Next.js/React props or data attributes
    const dataProps = html.match(/data-[^=]*="[^"]*"/gi) || [];
    console.log(`\nFound ${dataProps.length} data attributes`);

    // Look for window variables or __NEXT_DATA__
    const windowVars = html.match(/window\.[^=]*=.*?;/gi) || [];    const nextData: string[] = html.match(/__NEXT_DATA__[^<]*/gi) || [];
    
    console.log(`Found ${windowVars.length} window variables`);
    console.log(`Found ${nextData.length} Next.js data blocks`);

    if (nextData.length > 0) {
      console.log('\n📋 Next.js data:');
      nextData.forEach((data: string, i) => {
        console.log(`   Data ${i + 1}: ${data.substring(0, 300)}...`);
      });
    }

    console.log('\n🎯 Check framepack-debug.html file for full content analysis');

  } catch (error) {
    console.error('❌ Debug analysis failed:', error);
    throw error;
  }
}

// Run debug
if (require.main === module) {
  debugFramePackHTML().catch(console.error);
}

export { debugFramePackHTML };
