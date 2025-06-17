#!/usr/bin/env tsx

/**
 * Bulk Video Import Script
 * 
 * This script scans a directory for video files and imports them into the 
 * asset pipeline system using the MediaIngestService.
 * 
 * Usage:
 *   npm run bulk-import -- --dir /path/to/videos --tags "tag1,tag2,tag3"
 *   OR
 *   npx tsx scripts/bulk-video-import.ts --dir /path/to/videos --tags "tag1,tag2,tag3"
 *   
 * Options:
 *   --dir, -d        Directory to scan for video files (required)
 *   --tags, -t       Comma-separated list of tags to apply to all videos
 *   --title-prefix   Prefix to add to all video titles
 *   --description    Description to apply to all videos
 *   --content-purpose Content purpose (content, intro, outro, etc.)
 *   --overwrite      Overwrite existing assets (default: false)
 *   --recursive, -r  Scan directories recursively (default: true)
 *   --dry-run        Show what would be processed without actually importing
 *   --help, -h       Show this help message
 * 
 * Per-Directory Tags:
 *   You can place a 'tags.txt' file in any directory containing comma-separated tags.
 *   These tags will be applied to all video files in that directory.
 *   Directory tags are combined with global tags specified via --tags.
 *   
 *   Example tags.txt content: "intro,tutorial,beginner"
 */

import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import { MediaIngestService } from '../src/media/ingest/MediaIngestService';
import { AssetManager } from '../src/media/AssetManager';
import { VideoAsset } from '../src/media/video';
import { ContentPurpose } from '../src/media/types';
import { MediaIngestOptions } from '../src/media/ingest/types';

// Supported video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

interface ImportOptions {
  directory: string;
  tags?: string[];
  titlePrefix?: string;
  description?: string;
  contentPurpose?: ContentPurpose[];
  overwrite: boolean;
  recursive: boolean;
  dryRun: boolean;
}

interface ImportResult {
  success: boolean;
  filePath: string;
  assetId?: string;
  error?: string;
  skipped?: boolean;
}

interface ImportSummary {
  totalFiles: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  results: ImportResult[];
}

/**
 * Find all video files in a directory and collect per-directory tags
 */
function findVideoFiles(directory: string, recursive: boolean = true): { files: string[], directoryTags: Map<string, string[]> } {
  const videoFiles: string[] = [];
  const directoryTags: Map<string, string[]> = new Map();
  
  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      // Look for tags.txt in this directory
      const tagsFilePath = path.join(dir, 'tags.txt');
      let dirTags: string[] = [];
      
      if (fs.existsSync(tagsFilePath)) {
        try {
          const tagsContent = fs.readFileSync(tagsFilePath, 'utf8').trim();
          if (tagsContent) {
            // Split by comma, trim whitespace, and filter out empty strings
            dirTags = tagsContent.split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);
            
            console.log(`📋 Found tags.txt in ${dir}: [${dirTags.join(', ')}]`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not read tags.txt in ${dir}:`, error);
        }
      }
      
      // Store directory tags for this path
      if (dirTags.length > 0) {
        directoryTags.set(dir, dirTags);
      }
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && recursive) {
          scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.includes(ext)) {
            videoFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }
  
  scanDirectory(directory);
  return { files: videoFiles.sort(), directoryTags };
}

/**
 * Get tags for a specific file based on its directory and global options
 */
function getTagsForFile(filePath: string, directoryTags: Map<string, string[]>, globalTags?: string[]): string[] {
  const fileDir = path.dirname(filePath);
  const allTags: string[] = [];
  
  // Add global tags first
  if (globalTags && globalTags.length > 0) {
    allTags.push(...globalTags);
  }
  
  // Add directory-specific tags
  const dirTags = directoryTags.get(fileDir);
  if (dirTags && dirTags.length > 0) {
    allTags.push(...dirTags);
  }
  
  // Remove duplicates and return
  return [...new Set(allTags)];
}

/**
 * Calculate the expected relative path that would be stored for a file
 * This mirrors the logic in BaseMediaDiscovery.getRelativePath()
 */
function calculateExpectedAssetPath(filePath: string): string {
  // Check if the file is in the public folder already
  const publicIndex = filePath.indexOf('public');

  if (publicIndex !== -1) {
    // Return path relative to public directory
    return filePath.substring(publicIndex + 'public'.length).replace(/\\/g, '/');
  }

  // For external files, preserve directory structure when copying
  const pathParts = filePath.split(path.sep);
  const filename = path.basename(filePath);
  
  // Look for common bulk import patterns
  let targetSubPath = 'uploads'; // default
  
  // If path contains common media folders, preserve that structure
  const mediaFolders = ['videos', 'images', 'audio', 'media', 'assets'];
  const bulkFolders = ['bulk_uploads', 'imports', 'temp', 'staging'];
  
  // Find the index of a media folder or bulk folder in the path
  let preserveFromIndex = -1;
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i].toLowerCase();
    if (mediaFolders.includes(part)) {
      preserveFromIndex = i;
      break;
    }
    // If we find a bulk folder, start preserving from the next folder
    if (bulkFolders.some(bulk => part.includes(bulk.toLowerCase()))) {
      preserveFromIndex = i + 1;
      break;
    }
  }
  
  // Build target path preserving structure
  if (preserveFromIndex >= 0 && preserveFromIndex < pathParts.length - 1) {
    // Preserve structure from the detected folder onwards
    const preservedParts = pathParts.slice(preserveFromIndex, -1); // exclude filename
    targetSubPath = preservedParts.join('/');
  }
  
  const publicPath = `/${targetSubPath}/${filename}`;
  return publicPath.replace(/\\/g, '/');
}

/**
 * Import a single video file
 */
async function importVideoFile(
  filePath: string, 
  mediaIngestService: MediaIngestService,
  options: ImportOptions,
  directoryTags: Map<string, string[]>
): Promise<ImportResult> {
  try {
    const filename = path.basename(filePath);
    
    // Calculate the expected asset path that would be stored
    const expectedAssetPath = calculateExpectedAssetPath(filePath);
    
    // Check if an asset with this path already exists (unless overwrite is enabled)
    if (!options.overwrite) {
      const assetManager = mediaIngestService.getAssetManager();
      if (assetManager && assetManager.assetExistsByPath(expectedAssetPath)) {
        console.log(`  Skipping: ${filename} (already exists at ${expectedAssetPath})`);
        return {
          success: true,
          filePath,
          assetId: 'skipped-existing',
          skipped: true
        };
      }
    }
    
    const titlePrefix = options.titlePrefix ? `${options.titlePrefix} ` : '';
    const defaultTitle = `${titlePrefix}${path.parse(filename).name}`;
    
    // Get combined tags (global + directory-specific)
    const combinedTags = getTagsForFile(filePath, directoryTags, options.tags);
    
    const ingestOptions: MediaIngestOptions = {
      path: filePath,
      generateId: true,
      extractTags: true,
      overwriteExisting: options.overwrite,
      defaultTitle,
      defaultDescription: options.description,
      defaultTags: combinedTags,
      defaultContentPurpose: options.contentPurpose?.map(p => p.toString())
    };
    
    // Show tags being applied
    if (combinedTags.length > 0) {
      console.log(`  Processing: ${filename} [tags: ${combinedTags.join(', ')}]`);
    } else {
      console.log(`  Processing: ${filename}`);
    }
    
    if (options.dryRun) {
      return {
        success: true,
        filePath,
        assetId: 'dry-run-id'
      };
    }
    
    const result = await mediaIngestService.ingestFile<VideoAsset>(filePath, ingestOptions);
    
    if (result.success && result.asset) {
      return {
        success: true,
        filePath,
        assetId: result.asset.id
      };
    } else {
      return {
        success: false,
        filePath,
        error: result.error || 'Unknown error during ingestion'
      };
    }
  } catch (error) {
    return {
      success: false,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main import function
 */
async function bulkImportVideos(options: ImportOptions): Promise<ImportSummary> {
  console.log('🎬 Bulk Video Import Starting...');
  console.log(`📁 Directory: ${options.directory}`);
  console.log(`🏷️  Tags: ${options.tags?.join(', ') || 'None'}`);
  console.log(`🔄 Recursive: ${options.recursive}`);
  console.log(`📝 Dry Run: ${options.dryRun}`);
  console.log('');
  
  // Find all video files and directory tags
  console.log('🔍 Scanning for video files...');
  const { files: videoFiles, directoryTags } = findVideoFiles(options.directory, options.recursive);
  console.log(`📊 Found ${videoFiles.length} video files`);
  console.log('');
  
  if (videoFiles.length === 0) {
    console.log('❌ No video files found in the specified directory');
    return {
      totalFiles: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      results: []
    };
  }
  
  // Initialize media ingest system
  if (!options.dryRun) {
    console.log('🚀 Initializing media ingest system...');
    const assetManager = new AssetManager();
    await assetManager.initialize();
    
    const mediaIngestService = new MediaIngestService(assetManager);
    await mediaIngestService.initialize();
    console.log('✅ Media ingest system ready');
    console.log('');
  }
  
  // Process files
  console.log('📥 Starting import process...');
  const results: ImportResult[] = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  const assetManager = options.dryRun ? null : new AssetManager();
  if (assetManager && !options.dryRun) {
    await assetManager.initialize();
  }
  
  const mediaIngestService = options.dryRun ? null : new MediaIngestService(assetManager!);
  if (mediaIngestService && !options.dryRun) {
    await mediaIngestService.initialize();
  }
  
  for (let i = 0; i < videoFiles.length; i++) {
    const filePath = videoFiles[i];
    const progress = `[${i + 1}/${videoFiles.length}]`;
    
    console.log(`${progress} Processing: ${path.basename(filePath)}`);
    
    const result = await importVideoFile(filePath, mediaIngestService!, options, directoryTags);
    results.push(result);
    
    if (result.success) {
      if (result.skipped) {
        skippedCount++;
        console.log(`  ⏭️  Skipped - Already exists`);
      } else {
        successCount++;
        console.log(`  ✅ Success - Asset ID: ${result.assetId}`);
      }
    } else {
      errorCount++;
      console.log(`  ❌ Error: ${result.error}`);
    }
    
    console.log('');
  }
  
  return {
    totalFiles: videoFiles.length,
    successCount,
    errorCount,
    skippedCount,
    results
  };
}

/**
 * Print summary report
 */
function printSummary(summary: ImportSummary, options: ImportOptions) {
  console.log('📊 Import Summary');
  console.log('================');
  console.log(`Total files found: ${summary.totalFiles}`);
  console.log(`Successfully imported: ${summary.successCount}`);
  console.log(`Skipped (already exist): ${summary.skippedCount}`);
  console.log(`Errors: ${summary.errorCount}`);
  console.log(`Success rate: ${summary.totalFiles > 0 ? Math.round(((summary.successCount + summary.skippedCount) / summary.totalFiles) * 100) : 0}%`);
  
  if (options.dryRun) {
    console.log('');
    console.log('🔍 This was a dry run - no files were actually imported');
  }
  
  if (summary.errorCount > 0) {
    console.log('');
    console.log('❌ Errors:');
    summary.results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${path.basename(r.filePath)}: ${r.error}`);
      });
  }
}

/**
 * Parse content purpose from string
 */
function parseContentPurpose(value: string): ContentPurpose[] {
  const purposes = value.split(',').map(p => p.trim().toLowerCase());
  const validPurposes: ContentPurpose[] = [];

  for (const purpose of purposes) {
    if (Object.values(ContentPurpose).includes(purpose as ContentPurpose)) {
      validPurposes.push(purpose as ContentPurpose);
    } else {
      console.warn(`Warning: Invalid content purpose '${purpose}' - skipping`);
    }
  }

  return validPurposes.length > 0 ? validPurposes : [ContentPurpose.CONTENT];
}

/**
 * Main CLI function
 */
async function main() {
  program
    .name('bulk-video-import')
    .description('Bulk import video files into the asset pipeline system')
    .requiredOption('-d, --dir <directory>', 'Directory to scan for video files')
    .option('-t, --tags <tags>', 'Comma-separated list of tags to apply to all videos')
    .option('--title-prefix <prefix>', 'Prefix to add to all video titles')
    .option('--description <description>', 'Description to apply to all videos')
    .option('--content-purpose <purpose>', 'Content purpose (content, intro, outro, etc.)', 'content')
    .option('--overwrite', 'Overwrite existing assets', false)
    .option('-r, --recursive', 'Scan directories recursively', true)
    .option('--dry-run', 'Show what would be processed without actually importing', false)
    .parse();

  const opts = program.opts();
  
  // Validate directory
  if (!fs.existsSync(opts.dir)) {
    console.error(`❌ Directory does not exist: ${opts.dir}`);
    process.exit(1);
  }
  
  if (!fs.statSync(opts.dir).isDirectory()) {
    console.error(`❌ Path is not a directory: ${opts.dir}`);
    process.exit(1);
  }
  
  // Parse options
  const options: ImportOptions = {
    directory: path.resolve(opts.dir),
    tags: opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined,
    titlePrefix: opts.titlePrefix,
    description: opts.description,
    contentPurpose: parseContentPurpose(opts.contentPurpose),
    overwrite: opts.overwrite,
    recursive: opts.recursive,
    dryRun: opts.dryRun
  };
  
  try {
    const summary = await bulkImportVideos(options);
    printSummary(summary, options);
    
    // Exit with error code if there were failures
    if (summary.errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
