#!/usr/bin/env python3
"""
Quick backup script to save current config before testing new optimizations.
"""

import shutil
from pathlib import Path
from datetime import datetime

def backup_config():
    """Create a timestamped backup of the current config."""
    config_file = Path("config.yaml")
    
    if not config_file.exists():
        print("❌ config.yaml not found")
        return False
    
    # Create timestamped backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = Path(f"config.yaml.backup_{timestamp}")
    
    try:
        shutil.copy2(config_file, backup_file)
        print(f"✅ Config backed up to: {backup_file}")
        
        # Also create a simple pre-optimizations backup
        simple_backup = Path("config.yaml.pre-optimizations")
        shutil.copy2(config_file, simple_backup)
        print(f"✅ Config backed up to: {simple_backup}")
        
        return True
        
    except Exception as e:
        print(f"❌ Backup failed: {e}")
        return False

if __name__ == "__main__":
    print("📁 Creating config backup before testing new optimizations...")
    backup_config()
