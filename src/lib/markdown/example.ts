import {
  CharacterMarkdown,
  LocationMarkdown,
  TechnologyMarkdown,
  ThemeMarkdown
} from './index';

/**
 * Example of how to use the markdown classes
 */
async function example() {
  // Get all characters
  const characters = CharacterMarkdown.getAllCharacters();
  console.log(`Found ${characters.length} characters`);

  // Get a specific character
  const akiko = CharacterMarkdown.getCharacterBySlug('akiko');
  if (akiko) {
    console.log(`Character: ${akiko.getTitle()}`);
    console.log(`Description: ${akiko.getDescription()}`);

    // Character-specific image methods
    console.log(`Portrait Image: ${akiko.getPortraitImage()}`);
    console.log(`Hero Image: ${akiko.getHeroImage()}`);

    // Generic image methods (work on all content types)
    console.log(`Main Image: ${akiko.getMainImage()}`); // Same as hero for characters
    console.log(`Detailed Image: ${akiko.getDetailedImage()}`); // Same as portrait for characters
    console.log(`Alt Text: ${akiko.getAltText()}`);
    console.log(`Video: ${akiko.getVideo()}`);

    // Get a related location
    if (akiko.getRelatedLocations().length > 0) {
      const locationSlug = akiko.getRelatedLocations()[0].locationSlug;
      const location = LocationMarkdown.getLocationBySlug(locationSlug);

      if (location) {
        console.log(`\nRelated Location: ${location.getTitle()}`);
        console.log(`Level: ${location.getLevel()}`);

        // Same image methods work on locations
        console.log(`Main Image: ${location.getMainImage()}`);
        console.log(`Detailed Image: ${location.getDetailedImage()}`);
        console.log(`Alt Text: ${location.getAltText()}`);
        console.log(`Video: ${location.getVideo() || 'None'}`);
      }
    }
  }

  // Get all technologies
  const technologies = TechnologyMarkdown.getAllTechnologies();
  console.log(`\nFound ${technologies.length} technologies`);

  // Example with a technology
  if (technologies.length > 0) {
    const tech = technologies[0];
    console.log(`Technology: ${tech.getTitle()}`);
    console.log(`Category: ${tech.getCategory()}`);

    // Same image methods work on technologies
    console.log(`Main Image: ${tech.getMainImage()}`);
    console.log(`Detailed Image: ${tech.getDetailedImage()}`);
    console.log(`Alt Text: ${tech.getAltText()}`);
  }

  // Get all themes
  const themes = ThemeMarkdown.getAllThemes();
  console.log(`\nFound ${themes.length} themes`);

  // Example with a theme
  if (themes.length > 0) {
    const theme = themes[0];
    console.log(`Theme: ${theme.getTitle()}`);
    console.log(`Category: ${theme.getCategory()}`);

    // Same image methods work on themes
    console.log(`Main Image: ${theme.getMainImage()}`);
    console.log(`Detailed Image: ${theme.getDetailedImage()}`);
    console.log(`Alt Text: ${theme.getAltText()}`);
  }

  // Example of getting relationships between content types
  if (akiko) {
    // Get all technologies related to Akiko
    const relatedTechs = akiko.getRelatedTechnologies();
    console.log(`\n${akiko.getTitle()} is related to ${relatedTechs.length} technologies`);

    // Get details of the first related technology
    if (relatedTechs.length > 0) {
      const techSlug = relatedTechs[0].technologySlug;
      const tech = TechnologyMarkdown.getTechnologyBySlug(techSlug);

      if (tech) {
        console.log(`Related Technology: ${tech.getTitle()}`);
        console.log(`Relationship: ${relatedTechs[0].relationship}`);
      }
    }
  }
}

// Run the example
example().catch(console.error);
