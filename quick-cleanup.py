#!/usr/bin/env python3
"""
Quick OpenCut Cleanup Script - Simple version for immediate cleanup
"""

import os
import shutil
import sys
from pathlib import Path

def main():
    """Quick cleanup - removes common build artifacts."""
    root = Path(__file__).parent
    web_dir = root / "apps" / "web"
    
    # Items to clean (path, description)
    cleanup_items = [
        (web_dir / "out", "Next.js build output"),
        (web_dir / "out.backup", "Next.js backup"),
        (web_dir / "dist", "Distribution build"),
        (web_dir / ".next", "Next.js cache"),
        (web_dir / "test-results", "Test results"),
        (web_dir / "tsconfig.tsbuildinfo", "TS build info"),
        (web_dir / "prod.log", "Production log"),
        (web_dir / "temp-next-error.txt", "Temp error log"),
        (web_dir / "temp-next-output.txt", "Temp output log"),
    ]
    
    print("🧹 Quick OpenCut Cleanup")
    print("-" * 30)
    
    cleaned = 0
    for path, desc in cleanup_items:
        if path.exists():
            try:
                if path.is_file():
                    path.unlink()
                    print(f"✓ Removed {desc}")
                elif path.is_dir():
                    shutil.rmtree(path)
                    print(f"✓ Removed {desc}")
                cleaned += 1
            except Exception as e:
                print(f"✗ Failed to remove {desc}: {e}")
    
    if cleaned == 0:
        print("✨ Nothing to clean!")
    else:
        print(f"\n✅ Cleaned {cleaned} items!")
        print("💡 Run 'bun run dev' to restart development")

if __name__ == "__main__":
    main()