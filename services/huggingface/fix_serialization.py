#!/usr/bin/env python3
"""
Quick fix for the PyTorch serialization issue in model_manager.py
"""

import re

def fix_serialization():
    """Fix the PyTorch serialization issue in get_model_info"""
    
    # Read the current model_manager.py
    with open('model_manager.py', 'r') as f:
        content = f.read()
    
    # Find and replace the parameters line that causes serialization issues
    old_line = '"parameters": config.get_model_config(resolved_id)'
    new_code = '''# Get model config and make it JSON serializable
        model_config = config.get_model_config(resolved_id)
        serializable_config = {}
        for key, value in model_config.items():
            if str(type(value)) == "<class 'torch.dtype'>":  # Handle torch.dtype objects
                serializable_config[key] = str(value)
            else:
                serializable_config[key] = value
        
        return {
            "modelId": resolved_id,
            "modelType": model_info.model_type,
            "loaded": True,
            "loadTime": model_info.load_time,
            "lastUsed": model_info.last_used,
            "memoryUsage": model_info.memory_usage,
            "device": model_info.device,
            "precision": model_info.precision,
            "capabilities": capabilities,
            "parameters": serializable_config'''
    
    # Find the problematic return block and replace it
    pattern = r'return \{\s*"modelId": resolved_id,.*?"parameters": config\.get_model_config\(resolved_id\)\s*\}'
    
    replacement = new_code + '\n        }'
    
    # Replace using regex
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Write back
    with open('model_manager.py', 'w') as f:
        f.write(content)
    
    print("✅ Fixed PyTorch serialization issue in model_manager.py")

if __name__ == "__main__":
    fix_serialization()
