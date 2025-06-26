import { ZonosClient } from "./zonos-client.js";

async function voiceCloningTest() {
  console.log("🔍 Testing Voice Cloning...\n");
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected!");
    
    // Test with voice cloning using the example audio
    console.log("🎭 Generating TTS with voice cloning...");
    const clonedResult = await client.generateSpeech({
      text: "This voice is cloned from the reference audio. The TypeScript API is working perfectly!",
      speakerAudio: "../assets/exampleaudio.mp3",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 12.0,
        pitchStd: 50.0
      },
      generation: {
        cfgScale: 3.0,
        seed: 123
      }
    });
    
    console.log("✅ Voice cloned speech generated!");
    console.log("🎵 Result:", {
      seed: clonedResult.seed,
      url: clonedResult.url,
      sampleRate: clonedResult.sampleRate
    });
    
    await client.saveAudio(clonedResult, "voice_cloned_output.wav");
    console.log("✅ Voice cloned audio saved to voice_cloned_output.wav");
    
    // Test emotional TTS
    console.log("\n😊 Testing emotional TTS...");
    const emotionalResult = await client.generateSpeech({
      text: "I am so excited and happy to demonstrate this emotional speech synthesis!",
      emotion: {
        happiness: 0.9,
        neutral: 0.1
      },
      unconditional: {
        emotion: false // Use emotion conditioning
      },
      conditioning: {
        pitchStd: 70.0, // More variation for emotion
        speakingRate: 16.0
      }
    });
    
    console.log("✅ Emotional speech generated!");
    await client.saveAudio(emotionalResult, "emotional_output.wav");
    console.log("✅ Emotional audio saved to emotional_output.wav");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

voiceCloningTest().catch(console.error);
