/**
 * Utility functions for blog post processing
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { BLOG_POSTS_PATH } from './config';
import type { BlogPostData } from './types';

/**
 * Find a blog post by slug
 */
export function findBlogPostBySlug(slug: string): string | null {
  // Check for exact match with .md or .mdx extension
  const exactMatches = [
    path.join(BLOG_POSTS_PATH, `${slug}.md`),
    path.join(BLOG_POSTS_PATH, `${slug}.mdx`)
  ];

  for (const filePath of exactMatches) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Update the MDX file with the generated image paths
 */
export async function updateMdxFile(mdxPath: string, updatedData: Partial<BlogPostData>): Promise<boolean> {
  try {
    console.log(`Updating MDX file: ${mdxPath}...`);

    // Read the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');

    // Parse the frontmatter
    const { data, content: body } = matter(content);

    // Update the data
    const newData = { ...data, ...updatedData };

    // Rewrite the file with updated frontmatter
    const updatedContent = matter.stringify(body, newData);
    fs.writeFileSync(mdxPath, updatedContent);

    console.log(`✅ MDX file updated successfully: ${mdxPath}`);
    return true;
  } catch (error) {
    console.error(`Error updating MDX file:`, error);
    return false;
  }
}
