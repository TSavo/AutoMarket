/**
 * Simple test to verify @gradio/client import fix
 */

async function testGradioImport() {
  try {
    console.log('Testing @gradio/client dynamic import...');
    
    // Try dynamic import
    const gradio = await import("@gradio/client");
    console.log('✅ @gradio/client imported successfully');
    console.log('Available exports:', Object.keys(gradio));
    
    const Client = gradio.Client;
    if (Client) {
      console.log('✅ Client class found');
      console.log('Client type:', typeof Client);
    } else {
      console.log('❌ Client class not found');
    }
    
  } catch (error) {
    console.error('❌ Failed to import @gradio/client:', error);
  }
}

testGradioImport();
