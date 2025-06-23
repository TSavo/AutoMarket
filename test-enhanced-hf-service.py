"""
Test Enhanced HuggingFace Service with Audio Support

This tests that the enhanced service can:
1. Load text-to-audio models
2. Generate audio from text
3. Maintain backward compatibility with text-to-image
"""

import requests
import json
import base64
import time
import os

# Service configuration
SERVICE_URL = "http://localhost:8007"

def test_service_health():
    """Test that the service is healthy"""
    print("🔍 Testing service health...")
    
    try:
        response = requests.get(f"{SERVICE_URL}/health")
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Service is healthy")
            print(f"   Status: {health['status']}")
            print(f"   Loaded models: {health['loadedModels']}")
            return True
        else:
            print(f"❌ Service health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Service health check failed: {e}")
        return False

def test_load_audio_model():
    """Test loading a text-to-audio model"""
    print("\n🎵 Testing audio model loading...")
    
    # Try to load a text-to-audio model (this will auto-detect type)
    model_id = "microsoft/speecht5_tts"
    
    payload = {
        "modelId": model_id,
        "modelType": "text-to-audio",  # Explicitly specify
        "force": False
    }
    
    try:
        print(f"   Loading model: {model_id}")
        response = requests.post(f"{SERVICE_URL}/models/load", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Audio model loaded successfully!")
            print(f"   Model ID: {result['modelId']}")
            print(f"   Model Type: {result.get('modelType', 'unknown')}")
            print(f"   Load Time: {result['loadTime']}ms")
            print(f"   Memory Usage: {result['memoryUsage']}MB")
            return True
        else:
            print(f"❌ Audio model loading failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Audio model loading failed: {e}")
        return False

def test_generate_audio():
    """Test generating audio from text"""
    print("\n🎤 Testing audio generation...")
    
    # Try to generate audio
    model_id = "microsoft/speecht5_tts"
    text_prompt = "Hello, this is a test of the enhanced HuggingFace service with audio support!"
    
    payload = {
        "modelId": model_id,
        "prompt": text_prompt,
        "voice": "default",
        "speed": 1.0,
        "sampleRate": 22050,
        "format": "wav"
    }
    
    try:
        print(f"   Generating audio: '{text_prompt[:50]}...'")
        response = requests.post(f"{SERVICE_URL}/generate/audio", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result["success"] and result.get("audioBase64"):
                print(f"✅ Audio generated successfully!")
                print(f"   Generation Time: {result['metadata']['generationTime']:.2f}s")
                print(f"   Audio Format: {result['metadata']['format']}")
                print(f"   Sample Rate: {result['metadata']['sampleRate']}")
                print(f"   Duration: {result['metadata'].get('duration', 0):.2f}s")
                
                # Save audio to file
                os.makedirs("./generated_audio", exist_ok=True)
                audio_filename = f"./generated_audio/test_audio_{int(time.time())}.wav"
                
                with open(audio_filename, "wb") as f:
                    f.write(base64.b64decode(result["audioBase64"]))
                
                print(f"   Saved to: {audio_filename}")
                return True
            else:
                print(f"❌ Audio generation failed: {result.get('error', 'Unknown error')}")
                return False
                
        else:
            print(f"❌ Audio generation request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Audio generation failed: {e}")
        return False

def test_backward_compatibility():
    """Test that text-to-image still works (backward compatibility)"""
    print("\n🖼️  Testing backward compatibility (text-to-image)...")
    
    # Test that existing text-to-image models still work
    model_id = "runwayml/stable-diffusion-v1-5"  # Should already be loaded
    
    payload = {
        "modelId": model_id,
        "prompt": "a beautiful sunset over mountains",
        "width": 512,
        "height": 512,
        "numInferenceSteps": 10,  # Fast generation for testing
        "guidanceScale": 7.5
    }
    
    try:
        print(f"   Generating image with: {model_id}")
        response = requests.post(f"{SERVICE_URL}/generate", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result["success"] and result.get("imageBase64"):
                print(f"✅ Image generation still works!")
                print(f"   Generation Time: {result['metadata']['generationTime']:.2f}s")
                return True
            else:
                print(f"❌ Image generation failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Image generation request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Image generation test failed: {e}")
        return False

def test_model_info():
    """Test getting model information"""
    print("\n📋 Testing model information...")
    
    try:
        response = requests.get(f"{SERVICE_URL}/models")
        
        if response.status_code == 200:
            models = response.json()
            print(f"✅ Retrieved information for {len(models)} loaded models:")
            
            for model in models:
                model_type = model.get('modelType', 'unknown')
                capabilities = model.get('capabilities', [])
                print(f"   📦 {model['modelId']}")
                print(f"      Type: {model_type}")
                print(f"      Capabilities: {', '.join(capabilities)}")
                print(f"      Memory: {model['memoryUsage']}MB")
            
            return True
        else:
            print(f"❌ Model info request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Model info test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Enhanced HuggingFace Service with Audio Support")
    print("=" * 60)
    
    tests = [
        test_service_health,
        test_model_info,
        test_load_audio_model,
        test_generate_audio,
        test_backward_compatibility
    ]
    
    results = []
    
    for test in tests:
        result = test()
        results.append(result)
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {sum(results)}/{len(results)} passed")
    
    if all(results):
        print("🎉 All tests passed! Enhanced service is working correctly!")
        print("✅ Text-to-Image support: Working")
        print("✅ Text-to-Audio support: Working") 
        print("✅ Backward compatibility: Working")
    else:
        print("❌ Some tests failed. Check the output above for details.")
        failed_tests = [i for i, result in enumerate(results) if not result]
        print(f"Failed tests: {failed_tests}")

if __name__ == "__main__":
    main()
