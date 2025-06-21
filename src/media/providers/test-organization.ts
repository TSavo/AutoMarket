/**
 * Test file to verify the new provider-centric organization works
 */

// Clean import from provider package
import { 
  OpenRouterProvider, 
  OpenRouterTextToTextModel, 
  OpenRouterAPIClient 
} from './openrouter';

// This should work without any issues
console.log('Provider-centric imports work!');
console.log('OpenRouterProvider:', OpenRouterProvider.name);
console.log('OpenRouterTextToTextModel:', OpenRouterTextToTextModel.name);
console.log('OpenRouterAPIClient:', OpenRouterAPIClient.name);
