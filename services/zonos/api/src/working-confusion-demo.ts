import { ZonosClient } from "./zonos-client.js";

async function workingConfusionDemo() {
  console.log("🎭 Working Confusion.wav Demo\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio using confusion.wav as speaker reference
    console.log("🎵 Step 1: Generating first audio with confusion.wav voice");
    console.log("-".repeat(50));
    
    const firstResult = await client.generateSpeech({
      text: "Hello, this is the first part of our demonstration using the confusion audio as my voice reference.",
      speakerAudio: "../confusion.wav", // Use confusion.wav from the root directory
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0,
        pitchStd: 45.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 5000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.6,
        neutral: 0.4
      },
      unconditional: {
        emotion: false // Use emotion conditioning
      }
    });
    
    await client.saveAudio(firstResult, "confusion_part1.wav");
    console.log(`✅ First part generated: confusion_part1.wav`);
    console.log(`🌱 Seed: ${firstResult.seed}`);
    console.log(`🔗 URL: ${firstResult.url}\n`);
    
    // Step 2: Generate second audio with same voice but different emotion
    console.log("😊 Step 2: Continuing with same voice but happier emotion");
    console.log("-".repeat(50));
    
    const secondResult = await client.generateSpeech({
      text: "Now this is the second part, and I'm much more excited and happy about what we're demonstrating here!",
      speakerAudio: "../confusion.wav", // Keep same voice reference
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 16.0, // Slightly faster for excitement
        pitchStd: 55.0, // More variation for emotion
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 5001,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.9, // Much happier
        neutral: 0.1
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(secondResult, "confusion_part2.wav");
    console.log(`✅ Second part generated: confusion_part2.wav`);
    console.log(`🌱 Seed: ${secondResult.seed}`);
    console.log(`🔗 URL: ${secondResult.url}\n`);
    
    // Step 3: Generate comparison without voice cloning
    console.log("🎭 Step 3: Generating comparison without voice cloning");
    console.log("-".repeat(50));
    
    const comparisonResult = await client.generateSpeech({
      text: "This is the same text but without using the confusion audio as a voice reference, so you can hear the difference.",
      // No speakerAudio - use default voice
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 14.0,
        pitchStd: 45.0,
        vqScore: 0.75
      },
      generation: {
        cfgScale: 2.8,
        seed: 5002,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.6,
        neutral: 0.4
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(comparisonResult, "default_voice_comparison.wav");
    console.log(`✅ Default voice comparison: default_voice_comparison.wav`);
    console.log(`🌱 Seed: ${comparisonResult.seed}\n`);
    
    // Summary
    console.log("🎊 Confusion.wav Demo Complete!");
    console.log("=" .repeat(50));
    console.log("Generated audio sequence:");
    console.log("🎭 1. confusion_part1.wav - Using confusion.wav voice (neutral/happy)");
    console.log("😊 2. confusion_part2.wav - Same voice but much happier");
    console.log("🎤 3. default_voice_comparison.wav - Default voice for comparison");
    console.log("\n🎵 Listen to hear how the confusion.wav voice is consistently cloned!");
    console.log("📈 Notice the emotional progression while maintaining voice consistency.");
    console.log("🔄 Compare with the default voice to hear the cloning effect.");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

workingConfusionDemo().catch(console.error);
