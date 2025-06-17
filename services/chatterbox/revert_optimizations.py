#!/usr/bin/env python3
"""
Emergency revert script for TTS optimizations.
Use this if the new optimizations cause issues.
"""

import yaml
import shutil
from pathlib import Path

CONFIG_FILE = Path("config.yaml")
BACKUP_FILE = Path("config.yaml.pre-optimizations")

def backup_current_config():
    """Create a backup of the current config before making changes."""
    if CONFIG_FILE.exists():
        shutil.copy2(CONFIG_FILE, BACKUP_FILE)
        print(f"✅ Backed up current config to {BACKUP_FILE}")
        return True
    else:
        print(f"❌ Config file {CONFIG_FILE} not found")
        return False

def revert_to_safe_config():
    """Revert to safe optimization settings."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
        else:
            config = {}
        
        # Ensure tts_engine section exists
        if 'tts_engine' not in config:
            config['tts_engine'] = {}
        
        # Set safe optimization settings
        safe_settings = {
            'enable_torch_compile': True,  # Keep this - it worked great
            'enable_cuda_optimizations': False,  # Disable new CUDA opts
            'cuda_memory_fraction': 0.9,  # Safe default
            'enable_inference_mode': False,  # Disable new inference mode
            'enable_channel_last': False,  # Disable channel-last optimization
        }
        
        config['tts_engine'].update(safe_settings)
        
        # Save the reverted config
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False, indent=2)
        
        print("✅ Reverted to safe optimization settings:")
        print("   • torch.compile: ENABLED (this worked great)")
        print("   • CUDA optimizations: DISABLED")
        print("   • Inference mode: DISABLED")
        print("   • Channel-last format: DISABLED")
        print()
        print("🔄 Restart the server to apply changes:")
        print("   docker-compose down && docker-compose up --build")
        
        return True
        
    except Exception as e:
        print(f"❌ Error reverting config: {e}")
        return False

def restore_from_backup():
    """Restore config from backup file."""
    if BACKUP_FILE.exists():
        try:
            shutil.copy2(BACKUP_FILE, CONFIG_FILE)
            print(f"✅ Restored config from backup {BACKUP_FILE}")
            print("🔄 Restart the server to apply changes")
            return True
        except Exception as e:
            print(f"❌ Error restoring from backup: {e}")
            return False
    else:
        print(f"❌ Backup file {BACKUP_FILE} not found")
        return False

def show_current_settings():
    """Show current optimization settings."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            tts_engine = config.get('tts_engine', {})
            
            print("📊 Current TTS Engine Optimization Settings:")
            print(f"   • torch.compile: {tts_engine.get('enable_torch_compile', 'Not set')}")
            print(f"   • CUDA optimizations: {tts_engine.get('enable_cuda_optimizations', 'Not set')}")
            print(f"   • CUDA memory fraction: {tts_engine.get('cuda_memory_fraction', 'Not set')}")
            print(f"   • Inference mode: {tts_engine.get('enable_inference_mode', 'Not set')}")
            print(f"   • Channel-last format: {tts_engine.get('enable_channel_last', 'Not set')}")
            
        else:
            print(f"❌ Config file {CONFIG_FILE} not found")
            
    except Exception as e:
        print(f"❌ Error reading config: {e}")

def main():
    """Main revert script interface."""
    print("🛠️  TTS Optimization Revert Tool")
    print("=" * 40)
    
    while True:
        print()
        print("Options:")
        print("1. Show current settings")
        print("2. Create backup of current config")
        print("3. Revert to safe settings (keep torch.compile)")
        print("4. Restore from backup")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            show_current_settings()
        elif choice == '2':
            backup_current_config()
        elif choice == '3':
            if revert_to_safe_config():
                print("\n🎯 Safe settings applied. The server should work reliably now.")
                break
        elif choice == '4':
            if restore_from_backup():
                print("\n🎯 Backup restored.")
                break
        elif choice == '5':
            print("👋 Exiting without changes")
            break
        else:
            print("❌ Invalid choice. Please enter 1-5.")

if __name__ == "__main__":
    main()
