/**
 * Test the new /video/extractFrame endpoint
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const API_URL = 'http://localhost:8006';

async function testVideoToImageEndpoint() {
  try {
    console.log('🎯 Testing /video/extractFrame endpoint...');
      // Use video from test-videos directory
    const testVideoPath = path.join(__dirname, 'test-videos', 'base.mp4');
    
    if (!fs.existsSync(testVideoPath)) {
      console.log(`❌ Test video not found: ${testVideoPath}`);
      console.log('Available files in test-videos:');
      try {
        const files = fs.readdirSync(path.join(__dirname, 'test-videos'));
        files.forEach(file => console.log(`  - ${file}`));
      } catch (error) {
        console.log('❌ test-videos directory not found');
      }
      return;
    }
      console.log(`📹 Using test video: ${testVideoPath}`);
    
    // Check if file exists and get its size
    const stats = fs.statSync(testVideoPath);
    console.log(`📏 Video file size: ${stats.size} bytes`);
    
    // Create FormData for the request
    const FormData = require('form-data');
    const form = new FormData();
    
    // Add the video file
    console.log('📤 Adding video file to form...');
    form.append('video', fs.createReadStream(testVideoPath), {
      filename: path.basename(testVideoPath),
      contentType: 'video/mp4'
    });
      // Add extraction parameters
    form.append('frameTime', '5.0'); // Extract frame at 5 seconds
    form.append('format', 'jpg');   // Use JPG instead of PNG
    form.append('width', '640');
    form.append('height', '480');console.log('🚀 Sending request to extract frame...');
    
    const response = await axios.post(`${API_URL}/video/extractFrame`, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const result = response.data;
    console.log('✅ Success! Response:', JSON.stringify(result, null, 2));
    
    // If we got a result with a file, check if it exists
    if (result.success && result.data?.outputPath) {
      const outputExists = fs.existsSync(result.data.outputPath);
      console.log(`📁 Output file exists: ${outputExists}`);
      if (outputExists) {
        const stats = fs.statSync(result.data.outputPath);
        console.log(`📏 File size: ${stats.size} bytes`);
      }
    }
      } catch (error: any) {
    console.error('❌ Error testing endpoint:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - is the FFmpeg service running on port 8006?');
    }
  }
}

// Run the test
testVideoToImageEndpoint().then(() => {
  console.log('🏁 Test completed');
}).catch(console.error);
