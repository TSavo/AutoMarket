/**
 * Type definitions for blog post processing
 */

// Interface for blog image data
export interface BlogImageData {
  src?: string;
  animated?: string;
  altText?: string;
  generationPrompt?: string;
  negativePrompt?: string;
  animationPrompt?: string;
  params?: string;
  aspectRatio?: string;
}

// Interface for blog post data
export interface BlogPostData {
  title?: string;
  description?: string;
  date?: string;
  author?: string;
  images?: BlogImageData;
  blogImages?: BlogImageData[];
  audio?: {
    src: string;
    duration: number;
    fileSize: number;
    generated: string;
    provider: string;
    voice: string;
  };
  [key: string]: any;
}

// Interface for processing options
export interface ProcessingOptions {
  force?: boolean;
  debug?: boolean;
  audioOnly?: boolean;
}
