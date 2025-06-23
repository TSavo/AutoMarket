#!/usr/bin/env python3
"""
Quick fix script to update the HuggingFace service for multimodal support
"""

import re

def fix_model_validation():
    """Fix the model validation to support both diffusers and audio models"""
    
    # Read the current model_manager.py
    with open('model_manager.py', 'r') as f:
        content = f.read()
    
    # Find and replace the validation logic
    old_validation = r'''            # Check if it's a diffusers model
            if 'diffusers' not in info.tags:
                raise ValueError\(f"Model \{model_id\} is not a diffusers model"\)'''
    
    new_validation = '''            # Determine expected model type
            model_type = self.detect_model_type(model_id)
            
            # Validate based on model type
            if model_type == "text-to-image":
                # Check if it's a diffusers model
                if 'diffusers' not in info.tags:
                    raise ValueError(f"Model {model_id} is not a diffusers model")
            elif model_type == "text-to-audio":
                # For audio models, check for common audio-related tags
                audio_tags = ['text-to-speech', 'audio', 'tts', 'music', 'speech-synthesis']
                if not any(tag in info.tags for tag in audio_tags) and not any(keyword in model_id.lower() for keyword in ['tts', 'speecht5', 'musicgen', 'bark', 'xtts']):
                    # Don't fail for now - many audio models don't have proper tags
                    print(f"Warning: Model {model_id} might not be an audio model, but proceeding...")'''
    
    # Replace the validation
    content = re.sub(old_validation, new_validation, content, flags=re.MULTILINE | re.DOTALL)
    
    # Write back
    with open('model_manager.py', 'w') as f:
        f.write(content)
    
    print("✅ Fixed model validation in model_manager.py")

if __name__ == "__main__":
    fix_model_validation()
