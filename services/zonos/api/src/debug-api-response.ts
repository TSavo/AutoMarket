import { ZonosClient } from "./zonos-client.js";

async function debugApiResponse() {
  console.log("🔍 Debugging API Response Structure\n");
  console.log("=" .repeat(50));
  
  try {
    const client = new ZonosClient("http://localhost:7860");
    await client.connect();
    console.log("✅ Connected to Zonos TTS API\n");
    
    // Check what the raw API response looks like
    console.log("🔍 Raw API Response Debug:");
    console.log("-".repeat(40));
    
    // Call the API directly to see the full response
    const rawResult = await (client as any).client.predict(2, [
      "Zyphra/Zonos-v0.1-transformer",    // model_choice
      "This is a test to see the raw API response structure.",  // text
      "en-us",                            // language
      null,                               // speaker_audio
      null,                               // prefix_audio
      0.5,                                // emotion1 (happiness)
      0.05,                               // emotion2 (sadness)
      0.05,                               // emotion3 (disgust)
      0.05,                               // emotion4 (fear)
      0.05,                               // emotion5 (surprise)
      0.05,                               // emotion6 (anger)
      0.1,                                // emotion7 (other)
      0.3,                                // emotion8 (neutral)
      0.78,                               // vq_single_slider
      24000,                              // fmax_slider
      45.0,                               // pitch_std_slider
      15.0,                               // speaking_rate_slider
      4.0,                                // dnsmos_slider
      false,                              // speaker_noised_checkbox
      2.0,                                // cfg_scale_slider
      0,                                  // top_p_slider
      0,                                  // min_k_slider
      0,                                  // min_p_slider
      0.5,                                // linear_slider
      0.40,                               // confidence_slider
      0.00,                               // quadratic_slider
      12345,                              // seed_number
      false,                              // randomize_seed_toggle
      ["emotion"]                         // unconditional_keys
    ]);
    
    console.log("📊 Full Raw Result:");
    console.log(JSON.stringify(rawResult, null, 2));
    console.log("\n📊 Result Type:", typeof rawResult);
    console.log("📊 Result Constructor:", rawResult?.constructor?.name);
    
    if (rawResult && typeof rawResult === 'object') {
      console.log("\n🔍 Result Properties:");
      for (const [key, value] of Object.entries(rawResult)) {
        console.log(`  ${key}: ${typeof value} ${Array.isArray(value) ? `(length: ${value.length})` : ''}`);
        
        if (key === 'data' && Array.isArray(value)) {
          console.log("  📊 Data Array Contents:");
          value.forEach((item, index) => {
            console.log(`    [${index}]: ${typeof item} ${Array.isArray(item) ? `(length: ${item.length})` : ''}`);
            if (typeof item === 'object' && item !== null) {
              console.log(`      Properties: ${Object.keys(item).join(', ')}`);
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

debugApiResponse().catch(console.error);
