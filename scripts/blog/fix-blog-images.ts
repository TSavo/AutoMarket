import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Configuration
const HORIZON_CITY_PATH = path.resolve(__dirname, '../..');
const BLOG_POSTS_PATH = path.join(HORIZON_CITY_PATH, 'content', 'blog', 'posts');
const IMAGES_PATH = path.join(HORIZON_CITY_PATH, 'public/images/blog');
const VIDEOS_PATH = path.join(HORIZON_CITY_PATH, 'public/videos/blog');

// Interface for blog image data
interface BlogImageData {
  src?: string;
  animated?: string | null;
  altText?: string;
  generationPrompt?: string;
  negativePrompt?: string;
  animationPrompt?: string;
  params?: string;
  aspectRatio?: string;
}

// Interface for blog post data
interface BlogPostData {
  title?: string;
  description?: string;
  date?: string;
  author?: string;
  images?: BlogImageData;
  blogImages?: BlogImageData[];
  [key: string]: any;
}

/**
 * Find a blog post by slug
 */
function findBlogPostBySlug(slug: string): string | null {
  const mdxPath = path.join(BLOG_POSTS_PATH, `${slug}.mdx`);
  const mdPath = path.join(BLOG_POSTS_PATH, `${slug}.md`);

  if (fs.existsSync(mdxPath)) {
    return mdxPath;
  } else if (fs.existsSync(mdPath)) {
    return mdPath;
  }

  return null;
}

/**
 * Generate animation path from image path
 */
function getAnimationWebPath(imagePath: string, baseDir: string = '/videos/blog'): string {
  const imageBaseName = path.basename(imagePath, path.extname(imagePath));
  const outputVideoName = `${imageBaseName}-animated.mp4`;
  return `${baseDir}/${outputVideoName}`;
}

/**
 * Fix a blog post's image data
 */
async function fixBlogPost(slug: string): Promise<boolean> {
  try {
    console.log(`\n=== Fixing blog post: ${slug} ===\n`);

    // Find the MDX file
    const mdxPath = findBlogPostBySlug(slug);
    if (!mdxPath) {
      console.error(`❌ Blog post not found: ${slug}`);
      return false;
    }

    console.log(`Found blog post: ${mdxPath}`);

    // Read and parse the MDX file
    const content = fs.readFileSync(mdxPath, 'utf8');
    const { data, content: mdxContent } = matter(content) as { data: BlogPostData, content: string };

    let updatedData: Partial<BlogPostData> = {};
    let needsUpdate = false;

    // Fix main image
    if (data.images) {
      if (data.images.src && data.images.animated === undefined) {
        console.log(`Fixing main image animated property for ${slug}`);
        
        if (!updatedData.images) {
          updatedData.images = { ...data.images };
        }
        
        // Set animated to null if it's undefined
        updatedData.images.animated = null;
        needsUpdate = true;
      }
    }

    // Fix blog images
    if (data.blogImages && Array.isArray(data.blogImages)) {
      const updatedBlogImages: BlogImageData[] = [];
      let blogImagesNeedUpdate = false;

      for (const img of data.blogImages) {
        const updatedImg = { ...img };
        
        // Fix animated property if it's undefined
        if (updatedImg.src && updatedImg.animated === undefined) {
          console.log(`Fixing blog image animated property for ${updatedImg.src}`);
          updatedImg.animated = null;
          blogImagesNeedUpdate = true;
        }
        
        updatedBlogImages.push(updatedImg);
      }

      if (blogImagesNeedUpdate) {
        updatedData.blogImages = updatedBlogImages;
        needsUpdate = true;
      }
    }

    // Update the MDX file if needed
    if (needsUpdate) {
      console.log(`Updating MDX file: ${mdxPath}`);
      
      // Merge the updated data with the original data
      const mergedData = {
        ...data,
        ...updatedData,
        images: {
          ...data.images,
          ...updatedData.images
        }
      };
      
      // Write the updated MDX file
      const updatedFileContent = matter.stringify(mdxContent, mergedData);
      fs.writeFileSync(mdxPath, updatedFileContent);
      
      console.log(`✅ Successfully updated ${slug}`);
      return true;
    } else {
      console.log(`No updates needed for ${slug}`);
      return true;
    }
  } catch (error) {
    console.error(`Error fixing blog post ${slug}:`, error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const all = args.includes('--all');

  if (slug && !all) {
    console.log(`Fixing blog post: ${slug}`);
    await fixBlogPost(slug);
  } else if (all) {
    console.log('Fixing all blog posts...');

    // Get all blog post files
    const files = fs.readdirSync(BLOG_POSTS_PATH);
    const mdxFiles = files.filter(file => file.endsWith('.mdx') || file.endsWith('.md'));

    let successCount = 0;
    let failCount = 0;

    for (const file of mdxFiles) {
      const fileSlug = path.basename(file, path.extname(file));
      console.log(`\n=== Fixing ${fileSlug} ===`);

      try {
        const success = await fixBlogPost(fileSlug);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error fixing ${fileSlug}:`, error);
        failCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Successfully fixed: ${successCount}`);
    console.log(`Failed: ${failCount}`);
  } else {
    console.log('Usage: npm run fix-blog-images [slug] [--all]');
    console.log('  slug: The slug of the blog post to fix');
    console.log('  --all: Fix all blog posts');
  }
}

// Run the main function
main().catch(console.error);
