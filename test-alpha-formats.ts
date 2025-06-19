/**
 * Test different alpha format options for FFmpeg overlay filter
 */

import { FFMPEGAPIClient } from './src/media/clients/FFMPEGAPIClient';
import fs from 'fs';
import path from 'path';

async function testAlphaFormats() {
  console.log('🧪 Testing Different Alpha Format Options...\n');

  const apiClient = new FFMPEGAPIClient({
    baseUrl: 'http://localhost:8006',
    timeout: 300000
  });

  const baseVideoPath = path.resolve('./300-million-job-massacre-goldman-sachs-avatar.mp4');
  const overlayVideoPath = path.resolve('./overlay.webm');

  // Test different alpha format options
  const testCases = [
    {
      name: 'No alpha parameter (default)',
      filterComplex: "[1:v]scale=480:270[overlay_scaled];[0:v][overlay_scaled]overlay=1440:810:enable='between(t,5,30)'[output]"
    },
    {
      name: 'alpha=straight',
      filterComplex: "[1:v]scale=480:270[overlay_scaled];[0:v][overlay_scaled]overlay=1440:810:alpha=straight:enable='between(t,5,30)'[output]"
    },
    {
      name: 'alpha=premultiplied',
      filterComplex: "[1:v]scale=480:270[overlay_scaled];[0:v][overlay_scaled]overlay=1440:810:alpha=premultiplied:enable='between(t,5,30)'[output]"
    },
    {
      name: 'alpha=1 (numeric)',
      filterComplex: "[1:v]scale=480:270[overlay_scaled];[0:v][overlay_scaled]overlay=1440:810:alpha=1:enable='between(t,5,30)'[output]"
    },
    {
      name: 'format=yuva420p + alpha=straight',
      filterComplex: "[1:v]format=yuva420p,scale=480:270[overlay_scaled];[0:v][overlay_scaled]overlay=1440:810:alpha=straight:enable='between(t,5,30)'[output]"
    }
  ];

  for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);
    console.log(`   Filter: ${testCase.filterComplex}`);
    
    try {
      const result = await apiClient.composeVideo(
        baseVideoPath,
        overlayVideoPath,
        {
          outputFormat: 'mp4',
          filterComplex: testCase.filterComplex
        }
      );
      
      console.log(`   ✅ SUCCESS - Duration: ${result.metadata.duration}s`);
    } catch (error) {
      console.log(`   ❌ FAILED - ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

testAlphaFormats().catch(console.error);
