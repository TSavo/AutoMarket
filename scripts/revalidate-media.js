#!/usr/bin/env node
/**
 * Revalidate Media Pages Script
 * 
 * This script triggers revalidation of media-related pages to ensure they show
 * the latest data without requiring a server restart.
 * 
 * Usage:
 *   node scripts/revalidate-media.js
 */

// Get the site URL from environment or use default
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const REVALIDATION_TOKEN = process.env.REVALIDATION_TOKEN || 'your-secret-token';

// Log the start of the revalidation process
console.log(`Starting media pages revalidation on ${SITE_URL}...`);

// Function to revalidate a specific path
async function revalidatePath(path) {
  const revalidateUrl = `${SITE_URL}/api/admin/revalidate?path=${encodeURIComponent(path)}&token=${REVALIDATION_TOKEN}`;
  
  console.log(`Revalidating: ${path}`);
  
  try {
    const response = await fetch(revalidateUrl);
    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ Successfully revalidated: ${path}`);
    } else {
      console.error(`✗ Failed to revalidate ${path}: ${result.message}`);
    }
    
    return result.success;
  } catch (error) {
    console.error(`✗ Error revalidating ${path}:`, error.message);
    return false;
  }
}

// Function to revalidate all paths
async function revalidateAll() {
  const revalidateUrl = `${SITE_URL}/api/admin/revalidate?all=true&token=${REVALIDATION_TOKEN}`;
  
  console.log(`Revalidating all paths...`);
  
  try {
    const response = await fetch(revalidateUrl);
    const result = await response.json();
    
    if (result.success) {
      console.log(`✓ Successfully revalidated all paths`);
      if (result.revalidated && result.revalidated.length > 0) {
        console.log('Revalidated paths:');
        result.revalidated.forEach(path => console.log(`  - ${path}`));
      }
    } else {
      console.error(`✗ Failed to revalidate all paths: ${result.message}`);
    }
    
    return result.success;
  } catch (error) {
    console.error(`✗ Error revalidating all paths:`, error.message);
    return false;
  }
}

// Main function to run the script
async function main() {
  // Define paths that need to be revalidated
  const pathsToRevalidate = [
    '/admin/media',
    '/api/media/assets',
  ];
  
  // First try to revalidate all paths
  const allSuccess = await revalidateAll();
  
  if (!allSuccess) {
    console.log('Falling back to individual path revalidation...');
    
    // If that fails, revalidate individual paths
    let successCount = 0;
    
    for (const path of pathsToRevalidate) {
      const success = await revalidatePath(path);
      if (success) successCount++;
    }
    
    console.log(`Revalidation complete: ${successCount}/${pathsToRevalidate.length} paths successfully revalidated`);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error during revalidation:', error);
  process.exit(1);
});
