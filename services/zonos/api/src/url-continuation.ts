import { ZonosClient } from "./zonos-client.js";

async function urlContinuationDemo() {
  console.log("🔗 URL-based Continuation Demo\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Step 1: Generate first audio segment
    console.log("🎵 Step 1: Generating first audio segment");
    console.log("-".repeat(40));
    
    const firstResult = await client.generateSpeech({
      text: "This is the beginning of our continuation test. Listen carefully to the voice characteristics.",
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 13.0,
        pitchStd: 40.0
      },
      generation: {
        cfgScale: 2.5,
        seed: 2000,
        randomizeSeed: false
      },
      emotion: {
        happiness: 0.3,
        neutral: 0.7
      },
      unconditional: {
        emotion: false
      }
    });
    
    await client.saveAudio(firstResult, "url_part1.wav");
    console.log(`✅ First part generated: url_part1.wav`);
    console.log(`🌱 Seed: ${firstResult.seed}`);
    console.log(`🔗 Audio URL: ${firstResult.url}\n`);
    
    // Step 2: Try to use the URL directly for continuation
    console.log("🔄 Step 2: Attempting continuation with audio URL");
    console.log("-".repeat(40));
    
    try {
      // Try using the URL as prefix
      const continuationResult = await client.generateSpeech({
        text: "This should continue seamlessly from the previous segment, maintaining voice consistency.",
        prefixAudio: firstResult.url, // Use the URL directly
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 13.0,
          pitchStd: 40.0
        },
        generation: {
          cfgScale: 2.5,
          seed: 2001,
          randomizeSeed: false
        },
        emotion: {
          happiness: 0.5,
          neutral: 0.5
        },
        unconditional: {
          emotion: false
        }
      });
      
      await client.saveAudio(continuationResult, "url_part2.wav");
      console.log(`✅ Continuation generated: url_part2.wav`);
      console.log(`🌱 Seed: ${continuationResult.seed}\n`);
      
    } catch (error) {
      console.log("❌ URL-based continuation failed, trying alternative approach...\n");
      
      // Alternative: Generate without prefix but with same voice characteristics
      console.log("🔄 Step 2 Alternative: Generating with consistent voice settings");
      console.log("-".repeat(50));
      
      const altResult = await client.generateSpeech({
        text: "This continues the story with the same voice settings, even though we can't use the previous audio as a direct prefix.",
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 13.0, // Same settings as first
          pitchStd: 40.0,
          vqScore: 0.78,
          fmax: 24000
        },
        generation: {
          cfgScale: 2.5,
          seed: 2001, // Different seed but similar settings
          randomizeSeed: false
        },
        emotion: {
          happiness: 0.5, // Slight progression
          neutral: 0.5
        },
        unconditional: {
          emotion: false
        }
      });
      
      await client.saveAudio(altResult, "url_part2_alt.wav");
      console.log(`✅ Alternative continuation generated: url_part2_alt.wav`);
      console.log(`🌱 Seed: ${altResult.seed}\n`);
    }
    
    // Test with confusion.wav as speaker reference
    console.log("🎭 Step 3: Testing with confusion.wav as speaker reference");
    console.log("-".repeat(50));
    
    try {
      const confusionResult = await client.generateSpeech({
        text: "Now I'm using the confusion audio file as a voice reference to clone that specific voice.",
        speakerAudio: "../confusion.wav",
        conditioning: {
          dnsmos: 4.5,
          speakingRate: 14.0,
          pitchStd: 45.0
        },
        generation: {
          cfgScale: 3.0,
          seed: 3000
        },
        emotion: {
          happiness: 0.4,
          neutral: 0.6
        },
        unconditional: {
          emotion: false
        }
      });
      
      await client.saveAudio(confusionResult, "confusion_voice_clone.wav");
      console.log(`✅ Confusion voice clone generated: confusion_voice_clone.wav`);
      console.log(`🌱 Seed: ${confusionResult.seed}`);
      console.log(`🔗 URL: ${confusionResult.url}\n`);
      
    } catch (error) {
      console.log("❌ Voice cloning with confusion.wav failed:");
      console.log(error);
    }
    
    // Summary
    console.log("🎊 URL Continuation Demo Complete!");
    console.log("=" .repeat(50));
    console.log("Generated files:");
    console.log("📄 url_part1.wav - Original audio");
    console.log("📄 url_part2.wav or url_part2_alt.wav - Continuation attempt");
    console.log("📄 confusion_voice_clone.wav - Voice cloning test");
    console.log("\n💡 Note: Direct audio continuation may have limitations due to Gradio security.");
    console.log("🎵 Voice consistency can be maintained through matching conditioning parameters.");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

urlContinuationDemo().catch(console.error);
