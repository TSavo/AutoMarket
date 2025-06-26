import { ZonosClient, TTSConfig } from "./index.js";
import * as path from "path";

/**
 * Example usage of the Zonos API client
 */
async function example() {
  const client = new ZonosClient("http://localhost:7860");

  try {
    // Connect to the API
    console.log("Connecting to Zonos API...");
    await client.connect();

    // Example 1: Basic TTS
    console.log("Generating basic TTS...");
    const basicResult = await client.quickTTS(
      "Hello, this is a test of the Zonos text-to-speech system!"
    );
    
    await client.saveAudio(basicResult, "output_basic.wav");
    console.log("Basic TTS saved to output_basic.wav");

    // Example 2: TTS with voice cloning
    console.log("Generating TTS with voice cloning...");
    const voiceCloningResult = await client.generateSpeech({
      text: "This voice is cloned from the reference audio.",
      speakerAudio: "path/to/your/reference_voice.wav", // Replace with actual path
      conditioning: {
        dnsmos: 4.5,
        speakingRate: 12.0
      },
      generation: {
        cfgScale: 3.0,
        seed: 42
      }
    });
    
    await client.saveAudio(voiceCloningResult, "output_cloned.wav");
    console.log("Voice cloned TTS saved to output_cloned.wav");

    // Example 3: Emotional TTS
    console.log("Generating emotional TTS...");
    const emotionalResult = await client.generateSpeech({
      text: "I am very happy to demonstrate this emotional speech synthesis!",
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
        speakingRate: 18.0
      }
    });
    
    await client.saveAudio(emotionalResult, "output_emotional.wav");
    console.log("Emotional TTS saved to output_emotional.wav");

    // Example 4: Full configuration
    console.log("Generating TTS with full configuration...");
    const fullConfig: TTSConfig = {
      text: "This is a comprehensive example with all parameters configured.",
      modelChoice: "Zyphra/Zonos-v0.1-transformer",
      language: "en-us",
      speakerAudio: "path/to/speaker.wav", // Replace with actual path
      speakerNoised: true,
      emotion: {
        happiness: 0.7,
        neutral: 0.3,
        sadness: 0.0,
        anger: 0.0,
        fear: 0.0,
        surprise: 0.0,
        disgust: 0.0,
        other: 0.0
      },
      conditioning: {
        dnsmos: 4.8,
        fmax: 22050,
        vqScore: 0.75,
        pitchStd: 50.0,
        speakingRate: 14.0
      },
      generation: {
        cfgScale: 2.5,
        seed: 12345,
        randomizeSeed: false,
        linear: 0.7,
        confidence: 0.3,
        quadratic: 0.1,
        topP: 0.9,
        minK: 10,
        minP: 0.02
      },
      unconditional: {
        speaker: false,
        emotion: false,
        vqscore: false,
        fmax: false,
        pitchStd: false,
        speakingRate: false,
        dnsmos: false,
        speakerNoised: false
      }
    };

    const fullResult = await client.generateSpeech(fullConfig);
    await client.saveAudio(fullResult, "output_full_config.wav");
    console.log("Full configuration TTS saved to output_full_config.wav");
    console.log(`Used seed: ${fullResult.seed}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.disconnect();
    console.log("Disconnected from API");
  }
}

// Run the example
if (require.main === module) {
  example().catch(console.error);
}
