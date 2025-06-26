import { ZonosClient } from "./zonos-client.js";

async function comprehensiveDemo() {
  console.log("🎉 Zonos TypeScript API - Comprehensive Demo\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Demo 1: Basic TTS
    console.log("🎵 Demo 1: Basic Text-to-Speech");
    console.log("-".repeat(30));
    const basicResult = await client.quickTTS(
      "Welcome to the Zonos TypeScript API! This is a basic text-to-speech demonstration."
    );
    await client.saveAudio(basicResult, "demo_1_basic.wav");
    console.log(`✅ Generated: demo_1_basic.wav (Seed: ${basicResult.seed})`);
    console.log(`🔗 URL: ${basicResult.url}\n`);
    
    // Demo 2: Happy Emotion
    console.log("😊 Demo 2: Happy Emotional Speech");
    console.log("-".repeat(30));
    const happyResult = await client.generateSpeech({
      text: "I'm absolutely thrilled and excited to showcase this amazing emotional text-to-speech technology!",
      emotion: {
        happiness: 0.95,
        neutral: 0.05,
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
        pitchStd: 80.0, // High variation for excitement
        speakingRate: 18.0, // Faster for excitement
        dnsmos: 4.7
      },
      generation: {
        cfgScale: 2.8,
        seed: 1001
      }
    });
    await client.saveAudio(happyResult, "demo_2_happy.wav");
    console.log(`✅ Generated: demo_2_happy.wav (Seed: ${happyResult.seed})\n`);
    
    // Demo 3: Sad Emotion
    console.log("😢 Demo 3: Sad Emotional Speech");
    console.log("-".repeat(30));
    const sadResult = await client.generateSpeech({
      text: "This is a melancholic and sorrowful message, demonstrating the sad emotional capabilities of the system.",
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
        pitchStd: 25.0, // Low variation for sadness
        speakingRate: 10.0, // Slower for sadness
        dnsmos: 4.0
      },
      generation: {
        cfgScale: 3.0,
        seed: 1002
      }
    });
    await client.saveAudio(sadResult, "demo_3_sad.wav");
    console.log(`✅ Generated: demo_3_sad.wav (Seed: ${sadResult.seed})\n`);
    
    // Demo 4: Angry Emotion
    console.log("😠 Demo 4: Angry Emotional Speech");
    console.log("-".repeat(30));
    const angryResult = await client.generateSpeech({
      text: "I am absolutely furious and outraged about this situation! This demonstrates the anger emotion.",
      emotion: {
        happiness: 0.0,
        neutral: 0.1,
        sadness: 0.0,
        anger: 0.9,
        fear: 0.0,
        surprise: 0.0,
        disgust: 0.0,
        other: 0.0
      },
      unconditional: {
        emotion: false
      },
      conditioning: {
        pitchStd: 90.0, // High variation for anger
        speakingRate: 20.0, // Faster for anger
        dnsmos: 4.5
      },
      generation: {
        cfgScale: 3.2,
        seed: 1003
      }
    });
    await client.saveAudio(angryResult, "demo_4_angry.wav");
    console.log(`✅ Generated: demo_4_angry.wav (Seed: ${angryResult.seed})\n`);
    
    // Demo 5: Different Speaking Rates
    console.log("⚡ Demo 5: Variable Speaking Rate");
    console.log("-".repeat(30));
    
    // Fast speech
    const fastResult = await client.generateSpeech({
      text: "This is a demonstration of very fast speech synthesis with high speaking rate.",
      conditioning: {
        speakingRate: 25.0, // Very fast
        pitchStd: 50.0,
        dnsmos: 4.2
      },
      generation: {
        seed: 2001
      }
    });
    await client.saveAudio(fastResult, "demo_5_fast.wav");
    console.log(`✅ Generated: demo_5_fast.wav (Fast speech)`);
    
    // Slow speech
    const slowResult = await client.generateSpeech({
      text: "This is a demonstration of very slow and deliberate speech synthesis with low speaking rate.",
      conditioning: {
        speakingRate: 8.0, // Very slow
        pitchStd: 40.0,
        dnsmos: 4.3
      },
      generation: {
        seed: 2002
      }
    });
    await client.saveAudio(slowResult, "demo_5_slow.wav");
    console.log(`✅ Generated: demo_5_slow.wav (Slow speech)\n`);
    
    // Demo 6: High Quality vs Normal
    console.log("🎛️ Demo 6: Quality Comparison");
    console.log("-".repeat(30));
    
    // High quality
    const hqResult = await client.generateSpeech({
      text: "This sample demonstrates high quality audio generation with maximum DNSMOS setting.",
      conditioning: {
        dnsmos: 5.0, // Maximum quality
        vqScore: 0.8, // High VQ score
        fmax: 24000, // Full frequency range
        pitchStd: 45.0,
        speakingRate: 15.0
      },
      generation: {
        cfgScale: 3.5, // Higher guidance
        seed: 3001
      }
    });
    await client.saveAudio(hqResult, "demo_6_high_quality.wav");
    console.log(`✅ Generated: demo_6_high_quality.wav (High quality)`);
    
    // Standard quality
    const stdResult = await client.generateSpeech({
      text: "This sample demonstrates standard quality audio generation with default settings.",
      conditioning: {
        dnsmos: 3.0, // Lower quality
        vqScore: 0.6, // Lower VQ score
        fmax: 16000, // Reduced frequency range
        pitchStd: 45.0,
        speakingRate: 15.0
      },
      generation: {
        cfgScale: 2.0, // Lower guidance
        seed: 3002
      }
    });
    await client.saveAudio(stdResult, "demo_6_standard_quality.wav");
    console.log(`✅ Generated: demo_6_standard_quality.wav (Standard quality)\n`);
    
    // Summary
    console.log("🎊 Demo Complete!");
    console.log("=" .repeat(50));
    console.log("Generated audio files:");
    console.log("• demo_1_basic.wav - Basic TTS");
    console.log("• demo_2_happy.wav - Happy emotion");
    console.log("• demo_3_sad.wav - Sad emotion");
    console.log("• demo_4_angry.wav - Angry emotion");
    console.log("• demo_5_fast.wav - Fast speaking rate");
    console.log("• demo_5_slow.wav - Slow speaking rate");
    console.log("• demo_6_high_quality.wav - High quality audio");
    console.log("• demo_6_standard_quality.wav - Standard quality audio");
    console.log("\n🎵 All audio files are ready to play!");
    console.log("🔗 You can also access them via the provided URLs.");
    
  } catch (error) {
    console.error("❌ Demo failed:", error);
  }
}

comprehensiveDemo().catch(console.error);
