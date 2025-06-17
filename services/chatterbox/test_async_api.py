#!/usr/bin/env python3
"""
Test script for the new async TTS API endpoints.
Run this after starting the server to test the async functionality.
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any

# Server configuration
BASE_URL = "http://localhost:8004"

async def test_health_check(session: aiohttp.ClientSession) -> bool:
    """Test the health check endpoint."""
    print("🔍 Testing health check endpoint...")
    
    try:
        async with session.get(f"{BASE_URL}/health") as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Health check passed: {data}")
                return data.get("model_loaded", False)
            else:
                print(f"❌ Health check failed: {response.status}")
                return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False


async def test_async_tts(session: aiohttp.ClientSession, text: str, voice_mode: str = "predefined") -> str:
    """Test async TTS generation and return task ID."""
    print(f"🎤 Starting async TTS generation...")
    print(f"   Text: {text[:50]}{'...' if len(text) > 50 else ''}")
    print(f"   Voice mode: {voice_mode}")
    
    # Prepare request data
    request_data = {
        "text": text,
        "voice_mode": voice_mode,
        "output_format": "wav",
        "split_text": True,
        "chunk_size": 120
    }
    
    if voice_mode == "predefined":
        request_data["predefined_voice_id"] = "Emily.wav"  # Use default voice from config
    
    try:
        async with session.post(
            f"{BASE_URL}/tts/async",
            json=request_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                data = await response.json()
                task_id = data["task_id"]
                print(f"✅ Task created successfully: {task_id}")
                return task_id
            else:
                error_text = await response.text()
                print(f"❌ Failed to create task: {response.status} - {error_text}")
                return ""
    except Exception as e:
        print(f"❌ Error creating task: {e}")
        return ""


async def monitor_task_progress(session: aiohttp.ClientSession, task_id: str) -> bool:
    """Monitor task progress until completion."""
    print(f"📊 Monitoring task progress: {task_id}")
    
    max_wait_time = 300  # 5 minutes max
    start_time = time.time()
    last_progress = -1
    
    while time.time() - start_time < max_wait_time:
        try:
            async with session.get(f"{BASE_URL}/tts/status/{task_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    status = data["status"]
                    progress = data["progress"]
                    stage = data["current_stage"]
                    
                    # Only print if progress changed significantly
                    if abs(progress - last_progress) >= 5 or status in ["completed", "failed"]:
                        print(f"   📈 {progress:.1f}% - {status} - {stage}")
                        last_progress = progress
                    
                    if status == "completed":
                        print(f"✅ Task completed successfully!")
                        return True
                    elif status == "failed":
                        error_msg = data.get("error_message", "Unknown error")
                        print(f"❌ Task failed: {error_msg}")
                        return False
                    
                    # Wait before next check
                    await asyncio.sleep(2)
                else:
                    print(f"❌ Error checking status: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Error monitoring progress: {e}")
            return False
    
    print(f"⏰ Task monitoring timed out after {max_wait_time} seconds")
    return False


async def download_result(session: aiohttp.ClientSession, task_id: str) -> bool:
    """Download the completed TTS result."""
    print(f"⬇️ Downloading result for task: {task_id}")
    
    try:
        async with session.get(f"{BASE_URL}/tts/result/{task_id}") as response:
            if response.status == 200:
                # Get filename from headers
                content_disposition = response.headers.get("Content-Disposition", "")
                filename = f"test_result_{task_id[:8]}.wav"
                if "filename=" in content_disposition:
                    filename = content_disposition.split("filename=")[1].strip('"')
                
                # Save file
                content = await response.read()
                with open(filename, "wb") as f:
                    f.write(content)
                
                print(f"✅ Result downloaded: {filename} ({len(content)} bytes)")
                return True
            else:
                error_text = await response.text()
                print(f"❌ Failed to download result: {response.status} - {error_text}")
                return False
    except Exception as e:
        print(f"❌ Error downloading result: {e}")
        return False


async def test_task_list(session: aiohttp.ClientSession):
    """Test the task list endpoint."""
    print("📋 Testing task list endpoint...")
    
    try:
        async with session.get(f"{BASE_URL}/tts/tasks") as response:
            if response.status == 200:
                data = await response.json()
                print(f"✅ Task list retrieved: {data['total_count']} total, {data['running_count']} running")
                return True
            else:
                print(f"❌ Failed to get task list: {response.status}")
                return False
    except Exception as e:
        print(f"❌ Error getting task list: {e}")
        return False


async def cleanup_task(session: aiohttp.ClientSession, task_id: str):
    """Clean up a task."""
    print(f"🧹 Cleaning up task: {task_id}")
    
    try:
        async with session.delete(f"{BASE_URL}/tts/task/{task_id}") as response:
            if response.status == 200:
                print(f"✅ Task cleaned up successfully")
            else:
                print(f"⚠️ Task cleanup failed: {response.status}")
    except Exception as e:
        print(f"⚠️ Error cleaning up task: {e}")


async def main():
    """Run all tests."""
    print("🚀 Starting Async TTS API Tests")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        # Test health check
        model_loaded = await test_health_check(session)
        if not model_loaded:
            print("❌ Model not loaded, cannot continue with TTS tests")
            return
        
        print()
        
        # Test short text
        short_text = "Hello, this is a test of the async TTS API."
        task_id = await test_async_tts(session, short_text)
        
        if task_id:
            success = await monitor_task_progress(session, task_id)
            if success:
                await download_result(session, task_id)
            
            print()
            await test_task_list(session)
            print()
            await cleanup_task(session, task_id)
        
        print()
        
        # Test longer text
        long_text = """
        This is a longer text to test the chunking functionality of the async TTS API.
        The system should automatically split this text into smaller chunks for processing.
        Each chunk will be processed individually, and the progress should be reported
        as each chunk is completed. This allows users to track the progress of longer
        text-to-speech generation tasks and provides a much better user experience
        compared to the synchronous API where users have no visibility into the progress.
        """
        
        print("🎤 Testing with longer text (chunking)...")
        task_id2 = await test_async_tts(session, long_text.strip())
        
        if task_id2:
            success = await monitor_task_progress(session, task_id2)
            if success:
                await download_result(session, task_id2)
            await cleanup_task(session, task_id2)
    
    print()
    print("🎉 Async TTS API tests completed!")


if __name__ == "__main__":
    asyncio.run(main())
