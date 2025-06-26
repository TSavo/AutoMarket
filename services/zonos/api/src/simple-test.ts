import { ZonosClient } from "./zonos-client.js";

async function simpleClientTest() {
  console.log("🔍 Testing ZonosClient...\n");
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    console.log("✅ Client created");
    
    await client.connect();
    console.log("✅ Connected to Gradio!");
    
    // Try a simple TTS
    console.log("🎵 Generating speech...");
    const result = await client.quickTTS("Hello from the TypeScript API!");
    
    console.log("✅ Speech generated!");
    console.log("🎵 Result:", {
      seed: result.seed,
      url: result.url,
      sampleRate: result.sampleRate,
      audioDataLength: result.audioData?.length || 0
    });
    
    // Save to file
    await client.saveAudio(result, "test_output.wav");
    console.log("✅ Audio saved to test_output.wav");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

simpleClientTest().catch(console.error);
