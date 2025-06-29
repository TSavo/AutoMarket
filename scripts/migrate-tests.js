#!/usr/bin/env node

/**
 * Test Migration Script for asRole<T>() Pattern
 * 
 * This script automatically updates test files to use the new asRole<T>() pattern.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to replace in test files
const testReplacements = [
  // Replace individual role method calls
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
  // Replace string-based canPlayRole calls
  {
    old: /\.canPlayRole\('audio'\)/g,
    new: '.canPlayRole(Audio)'
  },
  {
    old: /\.canPlayRole\('video'\)/g,
    new: '.canPlayRole(Video)'
  },
  {
    old: /\.canPlayRole\('text'\)/g,
    new: '.canPlayRole(Text)'
  },
  {
    old: /\.canPlayRole\('image'\)/g,
    new: '.canPlayRole(Image)'
  },
  // Replace old role-specific methods
  {
    old: /\.canPlayAudioRole\(\)/g,
    new: '.canPlayRole(Audio)'
  },
  {
    old: /\.canPlayVideoRole\(\)/g,
    new: '.canPlayRole(Video)'
  },
  {
    old: /\.canPlayTextRole\(\)/g,
    new: '.canPlayRole(Text)'
  },
  {
    old: /\.canPlayImageRole\(\)/g,
    new: '.canPlayRole(Image)'
  }
];

function ensureImports(content, filePath) {
  // Check if Audio, Video, Text, Image are already imported
  const hasRoleImports = /import.*\{[^}]*(?:Audio|Video|Text|Image)[^}]*\}.*from.*roles/.test(content);
  
  if (!hasRoleImports) {
    // Find existing imports from roles
    const rolesImportMatch = content.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*roles['"]/);
    
    if (rolesImportMatch) {
      // Add to existing roles import
      const existingImports = rolesImportMatch[1];
      const newImports = existingImports + ', Audio, Video, Text, Image';
      content = content.replace(rolesImportMatch[0], rolesImportMatch[0].replace(rolesImportMatch[1], newImports));
    } else {
      // Add new import line
      const importLines = content.match(/^import.*$/gm) || [];
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]) + importLines[importLines.length - 1].length;
      
      const importPath = filePath.includes('test-') ? './src/media/assets/roles' : './roles';
      const newImport = `\nimport { Audio, Video, Text, Image } from '${importPath}';`;
      
      content = content.slice(0, lastImportIndex) + newImport + content.slice(lastImportIndex);
    }
  }
  
  return content;
}

function updateTestFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Apply replacements
  for (const replacement of testReplacements) {
    if (replacement.old.test(content)) {
      content = content.replace(replacement.old, replacement.new);
      changed = true;
    }
  }
  
  // Ensure proper imports
  if (changed) {
    content = ensureImports(content, filePath);
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function main() {
  console.log('🚀 Starting test file migration...\n');
  
  // Find all test files and examples
  const testFiles = [
    ...glob.sync('src/**/*.test.ts', { cwd: process.cwd(), absolute: true }),
    ...glob.sync('src/**/examples/**/*.ts', { cwd: process.cwd(), absolute: true }),
    ...glob.sync('test-*.ts', { cwd: process.cwd(), absolute: true })
  ];
  
  let updatedCount = 0;
  
  for (const file of testFiles) {
    if (updateTestFile(file)) {
      updatedCount++;
    }
  }
  
  console.log(`\n✨ Test migration complete! Updated ${updatedCount} files.`);
}

if (require.main === module) {
  main();
}

module.exports = { updateTestFile, testReplacements };
