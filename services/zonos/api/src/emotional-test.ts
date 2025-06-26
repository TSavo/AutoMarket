import { ZonosClient } from "./zonos-client.js";

async function emotionalTest() {
  console.log("🔍 Testing Emotional TTS (no voice cloning)...\n");
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected!");
    
    // Test emotional TTS without voice cloning
    console.log("😊 Testing emotional TTS...");
    const emotionalResult = await client.generateSpeech({
      text: "I am so excited and happy to demonstrate this emotional speech synthesis! This is working great!",
      emotion: {
        happiness: 0.9,
        neutral: 0.1,
        sadness: 0.0,
        anger: 0.0,
        fear: 0.0,
        surprise: 0.0,
        disgust: 0.0,
        other: 0.0
      },
      unconditional: {
        emotion: false // Use emotion conditioning
      },
      conditioning: {
        pitchStd: 70.0, // More variation for emotion
        speakingRate: 16.0,
        dnsmos: 4.5
      },
      generation: {
        cfgScale: 2.5,
        seed: 456
      }
    });
    
    console.log("✅ Emotional speech generated!");
    console.log("🎵 Result:", {
      seed: emotionalResult.seed,
      url: emotionalResult.url,
      sampleRate: emotionalResult.sampleRate
    });
    
    await client.saveAudio(emotionalResult, "emotional_happy.wav");
    console.log("✅ Emotional audio saved to emotional_happy.wav");
    
    // Test sad emotion
    console.log("\n😢 Testing sad emotion...");
    const sadResult = await client.generateSpeech({
      text: "This is a very sad and melancholic message to test emotional synthesis.",
      emotion: {
        happiness: 0.0,
        neutral: 0.1,
        sadness: 0.9,
        anger: 0.0,
        fear: 0.0,
        surprise: 0.0,
        disgust: 0.0,
        other: 0.0
      },
      unconditional: {
        emotion: false
      },
      conditioning: {
        pitchStd: 30.0, // Less variation for sad
        speakingRate: 12.0 // Slower for sad
      }
    });
    
    console.log("✅ Sad speech generated!");
    await client.saveAudio(sadResult, "emotional_sad.wav");
    console.log("✅ Sad audio saved to emotional_sad.wav");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

emotionalTest().catch(console.error);
