import { Client } from "@gradio/client";

async function testBasicTTS() {
  console.log("🔍 Testing basic TTS generation...\n");
  
  try {
    const client = await Client.connect("http://localhost:7860");
    console.log("✅ Connected to Gradio!");
    
    // Test with actual TTS generation using dependency index 2 (generate_audio)
    console.log("🎵 Generating speech...");
      const result = await client.predict(2, [
      "Zyphra/Zonos-v0.1-transformer", // model_choice (3)
      "Hello, this is a test of the Zonos text-to-speech system!", // text (4)
      "en-us", // language (5)
      null, // speaker_audio (9)
      null, // prefix_audio (7) - use null instead of file path
      1.0,   // happiness (48)
      0.05,  // sadness (49)
      0.05,  // disgust (50)
      0.05,  // fear (51)
      0.05,  // surprise (54)
      0.05,  // anger (55)
      0.1,   // other (56)
      0.2,   // neutral (57)
      0.78,  // vq_score (17)
      24000, // fmax (16)
      45.0,  // pitch_std (18)
      15.0,  // speaking_rate (19)
      4.0,   // dnsmos (15)
      false, // speaker_noised (10)
      2.0,   // cfg_scale (23)
      0,     // top_p (37)
      0,     // min_k (38)
      0,     // min_p (39)
      0.5,   // linear (31)
      0.40,  // confidence (32)
      0.00,  // quadratic (33)
      42,    // seed (24)
      true,  // randomize_seed (25)
      ["emotion"] // unconditional_keys (44)
    ]);
    
    console.log("✅ Speech generated successfully!");
    console.log("🎵 Full result:", JSON.stringify(result, null, 2));
    
    if (result && typeof result === 'object' && 'data' in result) {
      const data = (result as any).data;
      if (Array.isArray(data) && data.length >= 2) {
        console.log("🎵 Audio file created:", data[0]);
        console.log("🌱 Final seed used:", data[1]);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
  }
}

testBasicTTS().catch((err) => {
  console.error("❌ Uncaught error:", err);
  process.exit(1);
});
