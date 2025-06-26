#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Zonos TypeScript API Client...\n');

try {
  // Check if we're in the api directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Error: package.json not found. Make sure you\'re in the api directory.');
    process.exit(1);
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Build the project
  console.log('🔨 Building TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('\n✅ Setup complete!');
  console.log('\n📖 Next steps:');
  console.log('1. Start your Zonos Docker container: docker-compose up');
  console.log('2. Run the example: npm run test');
  console.log('3. Check the README.md for usage examples');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}
