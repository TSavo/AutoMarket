#!/usr/bin/env node

/**
 * Migration Script for asRole<T>() Pattern
 * 
 * This script automatically updates provider model files to use the new
 * asRole<T>() pattern instead of individual asText(), asAudio(), etc. methods.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to replace
const replacements = [
  {
    old: /\.asText\(\)/g,
    new: '.asRole(Text)'
  },
  {
    old: /\.asAudio\(\)/g,
    new: '.asRole(Audio)'
  },
  {
    old: /\.asVideo\(\)/g,
    new: '.asRole(Video)'
  },
  {
    old: /\.asImage\(\)/g,
    new: '.asRole(Image)'
  },
  {
    old: /new Text\(/g,
    new: 'Text.fromString('
  }
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const replacement of replacements) {
    if (replacement.old.test(content)) {
      content = content.replace(replacement.old, replacement.new);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🚀 Starting asRole<T>() migration...\n');
  
  // Find all provider model files
  const providerFiles = glob.sync('src/media/providers/**/*Model.ts', {
    cwd: process.cwd(),
    absolute: true
  });
  
  let updatedCount = 0;
  
  for (const file of providerFiles) {
    if (updateFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✨ Migration complete! Updated ${updatedCount} files.`);
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, replacements };
