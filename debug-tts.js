// Debug script to test Chatterbox TTS API directly
const fs = require('fs');

async function testTTSAPI() {
    console.log('🧪 Testing Chatterbox TTS API directly...');
    
    const requestBody = {
        text: "Hello, this is a test.",
        voice_mode: "predefined",
        output_format: "mp3",
        split_text: true,
        chunk_size: 120,
        temperature: 0.5,
        exaggeration: 0.5,
        cfg_weight: 0.5,
        speed_factor: 1.0,
        language: "auto",
        predefined_voice_id: "Abigail.wav"
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    try {
        console.log('🌐 Making fetch request...');
        
        const response = await fetch('http://localhost:8004/tts', {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 Response received:', {
            status: response?.status,
            statusText: response?.statusText,
            ok: response?.ok,
            headers: response?.headers ? Object.fromEntries(response.headers.entries()) : 'undefined'
        });
        
        if (!response) {
            console.error('❌ No response object received');
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Request failed:', response.status, response.statusText, errorText);
            return;
        }
        
        const contentType = response.headers.get('content-type');
        console.log('📋 Content-Type:', contentType);
        
        if (contentType?.includes('audio')) {
            console.log('🎵 Received audio response!');
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            const outputPath = 'debug-test.mp3';
            fs.writeFileSync(outputPath, buffer);
            console.log(`✅ Audio saved to ${outputPath} (${buffer.length} bytes)`);
        } else {
            const responseText = await response.text();
            console.log('📄 Response text:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Fetch error:', error);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    }
}

testTTSAPI();
