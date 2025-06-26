import { ZonosClient } from "./index.js";

async function testConnection() {
  console.log("🧪 Testing Zonos API Client...\n");
  
  const client = new ZonosClient("http://localhost:7860");

  try {
    // Test connection
    console.log("🔗 Connecting to Zonos API...");
    await client.connect();
    console.log("✅ Connected successfully!\n");

    // Test basic TTS generation
    console.log("🎵 Generating basic TTS...");
    const result = await client.quickTTS(
      "Hello! This is a test of the Zonos TypeScript API client."
    );
    
    console.log(`✅ Audio generated successfully!`);
    console.log(`   Sample Rate: ${result.sampleRate} Hz`);
    console.log(`   Duration: ${(result.audioData.length / result.sampleRate).toFixed(2)} seconds`);
    console.log(`   Seed: ${result.seed}\n`);

    // Save the audio file
    console.log("💾 Saving audio to file...");
    await client.saveAudio(result, "test_output.wav");
    console.log("✅ Audio saved to test_output.wav\n");

    console.log("🎉 All tests passed! The API client is working correctly.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    
    if (error instanceof Error && error.message.includes("Failed to connect")) {
      console.log("\n💡 Troubleshooting tips:");
      console.log("   1. Make sure Docker container is running: docker-compose up");
      console.log("   2. Check if Gradio is accessible at http://localhost:7860");
      console.log("   3. Wait a moment for the models to load on first startup");
    }
  } finally {
    await client.disconnect();
    console.log("🔌 Disconnected from API");
  }
}

// Run the test
testConnection().catch(console.error);
