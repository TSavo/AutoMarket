/**
 * Configuration and constants for media creation
 */

import fs from 'fs';
import path from 'path';

// Configuration for AutoMarket
export const AUTOMARKET_PATH = path.resolve(process.cwd());
export const BLOG_POSTS_PATH = path.join(AUTOMARKET_PATH, 'content', 'blog', 'posts');
export const IMAGES_PATH = path.join(AUTOMARKET_PATH, 'public/images/blog');
export const VIDEOS_PATH = path.join(AUTOMARKET_PATH, 'public/videos/blog');
export const AUDIO_PATH = path.join(AUTOMARKET_PATH, 'public/audio/blog');

/**
 * Initialize directories - ensure they exist
 */
export function initializeDirectories(): void {
  // Ensure directories exist
  if (!fs.existsSync(IMAGES_PATH)) {
    fs.mkdirSync(IMAGES_PATH, { recursive: true });
  }
  if (!fs.existsSync(VIDEOS_PATH)) {
    fs.mkdirSync(VIDEOS_PATH, { recursive: true });
  }
  if (!fs.existsSync(AUDIO_PATH)) {
    fs.mkdirSync(AUDIO_PATH, { recursive: true });
  }
}
