import { MarkdownFactory, ContentType } from './MarkdownFactory';
import { CharacterMarkdown } from './CharacterMarkdown';
import { StoryMarkdown } from './StoryMarkdown';

/**
 * Example of how to use the slug listing functionality
 */
async function slugsExample() {
  // Get all slugs for a specific content type
  const characterSlugs = MarkdownFactory.getAllSlugs('character');
  console.log(`Found ${characterSlugs.length} character slugs`);
  console.log('First 3 character slugs:');
  characterSlugs.slice(0, 3).forEach(slug => {
    console.log(`- ${slug.slug}: ${slug.title}`);
  });

  // Get all technology slugs
  const technologySlugs = MarkdownFactory.getAllSlugs('technology');
  console.log(`\nFound ${technologySlugs.length} technology slugs`);
  console.log('First 3 technology slugs:');
  technologySlugs.slice(0, 3).forEach(slug => {
    console.log(`- ${slug.slug}: ${slug.title}`);
  });

  // Get all story slugs for a specific series
  const hopeStorySlugs = MarkdownFactory.getAllSlugs('story', { series: 'Hope' });
  console.log(`\nFound ${hopeStorySlugs.length} story slugs in the Hope series`);
  console.log('First 3 Hope story slugs:');
  hopeStorySlugs.slice(0, 3).forEach(slug => {
    console.log(`- ${slug.slug}: ${slug.title}`);
  });

  // Get all content slugs
  const allSlugs = MarkdownFactory.getAllContentSlugs();
  console.log(`\nFound ${allSlugs.length} total content slugs`);
  console.log('Content type distribution:');

  // Count slugs by type
  const typeCounts = allSlugs.reduce((counts, slug) => {
    counts[slug.type] = (counts[slug.type] || 0) + 1;
    return counts;
  }, {} as Record<ContentType, number>);

  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} items`);
  });

  // Example of using slugs to create content instances
  console.log('\nCreating content instances from slugs:');

  // Get a random character slug
  const randomCharacterSlug = characterSlugs[Math.floor(Math.random() * characterSlugs.length)];
  console.log(`Selected random character: ${randomCharacterSlug.title}`);

  // Create the character instance with proper type
  const character = MarkdownFactory.create<CharacterMarkdown>('character', randomCharacterSlug.slug);
  if (character) {
    console.log(`Created character instance: ${character.getTitle()}`);
    console.log(`Full Name: ${character.getFullName()}`);
    console.log(`Description: ${character.getDescription().substring(0, 100)}...`);
  }

  // Example of fuzzy matching with slugs
  console.log('\nFuzzy matching example:');

  // Find a story slug that starts with a number (e.g., "01-clone")
  const numberedStorySlug = allSlugs.find(slug =>
    slug.type === 'story' && /^\d+-/.test(slug.slug)
  );

  if (numberedStorySlug) {
    console.log(`Found numbered story slug: ${numberedStorySlug.slug}`);

    // Extract the base slug without the number prefix
    const baseSlug = numberedStorySlug.slug.replace(/^\d+-/, '');
    console.log(`Base slug: ${baseSlug}`);

    // Try to find the story using the base slug with proper type
    const story = MarkdownFactory.create<StoryMarkdown>('story', baseSlug);
    if (story) {
      console.log(`Successfully found story using fuzzy matching: ${story.getTitle()}`);
      console.log(`Actual slug: ${story.getSlug()}`);
      console.log(`Series: ${story.getSeries()}`);
    }
  }
}

// Run the example
slugsExample().catch(console.error);
