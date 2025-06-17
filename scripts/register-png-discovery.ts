/**
 * Script to register the PngMediaDiscovery implementation in the MediaDiscoveryRegistry
 */

import { mediaDiscoveryRegistry } from '../src/media/ingest';
import { PngMediaDiscovery } from '../src/media/ingest/implementations/PngMediaDiscovery';

// Create a new instance of PngMediaDiscovery
const pngDiscovery = new PngMediaDiscovery();

// Register the PngMediaDiscovery implementation
mediaDiscoveryRegistry.register(pngDiscovery);

console.log(`PngMediaDiscovery registered with ID: ${pngDiscovery.getId()}`);

// Get all registered discoveries
const allDiscoveries = mediaDiscoveryRegistry.getAllDiscoveries();
console.log(`All registered discoveries: ${allDiscoveries.map(d => d.getId()).join(', ')}`);

// Check if PngMediaDiscovery is registered
const registeredPngDiscovery = allDiscoveries.find(d => d.getId() === 'png-media-discovery');
console.log(`PngMediaDiscovery registered: ${registeredPngDiscovery ? 'Yes' : 'No'}`);

console.log('PngMediaDiscovery registration complete!');
