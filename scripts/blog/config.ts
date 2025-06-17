/**
 * Configuration and constants for blog post processing
 */

import fs from 'fs';
import path from 'path';

// Configuration
export const HORIZON_CITY_PATH = path.resolve(__dirname, '../..');
export const BLOG_POSTS_PATH = path.join(HORIZON_CITY_PATH, 'content', 'blog', 'posts');
export const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/blog');
export const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/blog');
export const AUDIO_PATH = path.join(HORIZON_CITY_PATH, 'public/audio/blog');

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
