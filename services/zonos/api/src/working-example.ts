import { ZonosClient, TTSConfig } from "./zonos-client.js";

/**
 * Working example of the Zonos API client
 */
async function workingExample() {
  const client = new ZonosClient("http://localhost:7860");

  try {
    // Connect to the API
    console.log("🔌 Connecting to Zonos API...");
    await client.connect();

    // Example 1: Basic TTS
    console.log("\n🎵 Generating basic TTS...");
    const basicResult = await client.quickTTS(
      "Hello, this is a test of the Zonos text-to-speech system using the TypeScript API!"
    );
    
    await client.saveAudio(basicResult, "output_basic.wav");
    console.log("✅ Basic TTS saved to output_basic.wav");
    console.log(`🌱 Seed used: ${basicResult.seed}`);
    console.log(`🔗 Audio URL: ${basicResult.url}`);

    // Example 2: TTS with emotion control
    console.log("\n😊 Generating emotional TTS...");
    const emotionalResult = await client.generateSpeech({
      text: "I am very happy and excited to demonstrate this emotional speech synthesis!",
      emotion: {
        happiness: 0.9,
        neutral: 0.1,
        sadness: 0.0
      },
      unconditional: {
        emotion: false // Don't ignore emotion conditioning
      },
      conditioning: {
        pitchStd: 60.0, // More pitch variation for emotion
        speakingRate: 18.0,
        dnsmos: 4.5
      },
      generation: {
        cfgScale: 2.5,
        seed: 42 // Fixed seed for reproducibility
      }
    });
    
    await client.saveAudio(emotionalResult, "output_emotional.wav");
    console.log("✅ Emotional TTS saved to output_emotional.wav");
    console.log(`🌱 Seed used: ${emotionalResult.seed}`);

    // Example 3: Different model and language
    console.log("\n🌍 Generating with different settings...");
    const customResult = await client.generateSpeech({
      text: "This demonstrates custom conditioning parameters and generation settings.",
      modelChoice: "Zyphra/Zonos-v0.1-transformer",
      language: "en-us",
      conditioning: {
        dnsmos: 4.8,
        fmax: 20000,
        vqScore: 0.75,
        pitchStd: 40.0,
        speakingRate: 12.0
      },
      generation: {
        cfgScale: 3.0,
        linear: 0.7,
        confidence: 0.3,
        randomizeSeed: true
      },
      unconditional: {
        emotion: true, // Use unconditional emotion
        speaker: false
      }
    });

    await client.saveAudio(customResult, "output_custom.wav");
    console.log("✅ Custom TTS saved to output_custom.wav");
    console.log(`🌱 Seed used: ${customResult.seed}`);

    console.log("\n🎉 All examples completed successfully!");
    console.log("\n📂 Generated files:");
    console.log("   - output_basic.wav");
    console.log("   - output_emotional.wav");
    console.log("   - output_custom.wav");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.disconnect();
    console.log("\n🔌 Disconnected from API");
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  workingExample().catch(console.error);
}
