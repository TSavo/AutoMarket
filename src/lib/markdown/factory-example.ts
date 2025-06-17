import { MarkdownFactory } from './MarkdownFactory';
import { CharacterMarkdown } from './CharacterMarkdown';
import { LocationMarkdown } from './LocationMarkdown';
import { TechnologyMarkdown } from './TechnologyMarkdown';
import { ThemeMarkdown } from './ThemeMarkdown';
import { StoryMarkdown } from './StoryMarkdown';

/**
 * Example of how to use the markdown factory
 */
async function factoryExample() {
  // Create instances by type and slug with proper typing
  const akiko = MarkdownFactory.create<CharacterMarkdown>('character', 'akiko');
  const blueLevel = MarkdownFactory.create<LocationMarkdown>('location', 'blue-level');
  const _ai = MarkdownFactory.create<TechnologyMarkdown>('technology', 'artificial-intelligence');
  const _corporateControl = MarkdownFactory.create<ThemeMarkdown>('theme', 'corporate-control');

  // No type casting needed for specific methods
  if (akiko) {
    console.log(`Character: ${akiko.getTitle()}`);
    console.log(`Full Name: ${akiko.getFullName()}`);
    console.log(`Portrait: ${akiko.getPortraitImage()}`);

    // Generic methods work as before
    console.log(`Description: ${akiko.getDescription()}`);
    console.log(`Main Image: ${akiko.getMainImage()}`);
  }

  if (blueLevel) {
    console.log(`\nLocation: ${blueLevel.getTitle()}`);
    console.log(`Level: ${blueLevel.getLevel()}`);

    // Generic methods work as before
    console.log(`Description: ${blueLevel.getDescription()}`);
    console.log(`Main Image: ${blueLevel.getMainImage()}`);
  }

  // Get all instances of a type with proper typing
  const allThemes = MarkdownFactory.getAll<ThemeMarkdown>('theme');
  console.log(`\nFound ${allThemes.length} themes`);

  // Fuzzy matching example with stories
  // Assuming there's a story with slug like "01-clone"
  const cloneStory = MarkdownFactory.create<StoryMarkdown>('story', 'clone');

  if (cloneStory) {
    console.log(`\nStory: ${cloneStory.getTitle()}`);
    console.log(`Series: ${cloneStory.getSeries()}`);
    console.log(`Actual Slug: ${cloneStory.getSlug()}`); // Will show the full slug with numbers

    // Get character badges
    const characterBadges = cloneStory.getCharacterBadges();
    console.log(`Character Badges: ${characterBadges.join(', ')}`);

    // Get series badges
    const seriesBadges = cloneStory.getSeriesBadges();
    console.log(`Series Badges: ${seriesBadges.join(', ')}`);

    // Get all stories in the same series with proper typing
    const seriesStories = MarkdownFactory.getAll<StoryMarkdown>('story', { series: cloneStory.getSeries() });
    console.log(`Found ${seriesStories.length} stories in the ${cloneStory.getSeries()} series`);
  } else {
    console.log('\nNo story found with slug "clone"');
  }

  // Example of getting stories by series with proper typing
  const hopeStories = MarkdownFactory.getAll<StoryMarkdown>('story', { series: 'Hope' });
  console.log(`\nFound ${hopeStories.length} stories in the Hope series`);
}

// Run the example
factoryExample().catch(console.error);
