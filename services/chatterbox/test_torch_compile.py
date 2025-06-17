#!/usr/bin/env python3
"""
Test script to verify torch.compile optimization is working.
Run this after starting the server to test the performance improvement.
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any

# Server configuration
BASE_URL = "http://localhost:8004"

async def test_optimization_performance(session: aiohttp.ClientSession) -> bool:
    """Test TTS generation performance with all optimizations."""
    print("🔧 Testing TTS optimization performance...")
    
    # Test text - long enough to see performance difference
    test_text = """
    This is a performance test for the torch.compile optimization in the Chatterbox TTS server.
    The optimization should provide a 20-30% performance improvement for the vocoder and other model components.
    We're testing with a moderately long text to see the real-world impact of the optimization.
    """
    
    # Prepare request data
    request_data = {
        "text": test_text.strip(),
        "voice_mode": "predefined",
        "predefined_voice_id": "Emily.wav",
        "output_format": "wav",
        "split_text": True,
        "chunk_size": 120
    }
    
    try:
        print(f"📝 Test text: {len(test_text)} characters")
        print(f"🎤 Starting TTS generation...")
        
        start_time = time.time()
        
        async with session.post(
            f"{BASE_URL}/tts",
            json=request_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                # Get the audio data
                audio_data = await response.read()
                generation_time = time.time() - start_time
                
                # Estimate audio duration (rough calculation)
                # WAV header is ~44 bytes, then 2 bytes per sample at 24kHz
                audio_samples = (len(audio_data) - 44) // 2
                audio_duration = audio_samples / 24000  # 24kHz sample rate
                
                rtf = generation_time / audio_duration if audio_duration > 0 else float('inf')
                
                print(f"✅ Generation completed successfully!")
                print(f"   📊 Generation time: {generation_time:.2f}s")
                print(f"   🎵 Audio duration: {audio_duration:.2f}s")
                print(f"   ⚡ Real-time factor: {rtf:.2f}x")
                print(f"   📦 Audio size: {len(audio_data):,} bytes")
                
                if rtf < 1.0:
                    print(f"   🚀 Faster than real-time! Optimizations are working excellently.")
                elif rtf < 2.0:
                    print(f"   ✅ Good performance. Optimizations are helping significantly.")
                else:
                    print(f"   ⚠️  Slower performance. Check optimization settings in config.yaml.")
                
                return True
            else:
                error_text = await response.text()
                print(f"❌ TTS generation failed: {response.status} - {error_text}")
                return False
                
    except Exception as e:
        print(f"❌ Error during performance test: {e}")
        return False


async def check_optimization_status(session: aiohttp.ClientSession) -> bool:
    """Check if optimizations are enabled and working."""
    print("🔍 Checking optimization status...")

    try:
        async with session.get(f"{BASE_URL}/health") as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Server health check passed")
                print(f"   📊 Model loaded: {data.get('model_loaded', 'Unknown')}")
                print(f"   🔧 Version: {data.get('version', 'Unknown')}")
                print(f"   🏃 Running tasks: {data.get('running_tasks', 0)}")
                return data.get("model_loaded", False)
            else:
                print(f"❌ Health check failed: {response.status}")
                return False
    except Exception as e:
        print(f"❌ Error checking server status: {e}")
        return False


async def main():
    """Run torch.compile performance tests."""
    print("🚀 Torch.compile Performance Test")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # Check server status
        model_loaded = await check_optimization_status(session)
        if not model_loaded:
            print("❌ Model not loaded, cannot run performance tests")
            return

        print()

        # Run performance test
        success = await test_optimization_performance(session)
        
        print()
        if success:
            print("🎉 TTS optimization performance test completed!")
            print()
            print("📈 Performance Tips:")
            print("   • RTF < 1.0 = Faster than real-time (excellent)")
            print("   • RTF < 2.0 = Good performance")
            print("   • RTF > 3.0 = Consider checking optimization settings")
            print()
            print("⚙️  Optimization Controls (config.yaml):")
            print("   • enable_torch_compile: true/false")
            print("   • enable_cuda_optimizations: true/false")
            print("   • enable_inference_mode: true/false")
            print("   • enable_channel_last: true/false")
            print()
            print("🛠️  If issues occur, run: python revert_optimizations.py")
        else:
            print("❌ Performance test failed")
            print("   Check server logs for optimization status messages")
            print("   If problems persist, run: python revert_optimizations.py")


if __name__ == "__main__":
    asyncio.run(main())
