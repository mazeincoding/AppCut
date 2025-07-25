#!/usr/bin/env python3
"""
OpenCut Project Cleanup Script

This script cleans up build directories, cache files, and temporary files
to resolve development issues and free up disk space.

Usage:
  python cleanup.py                    # Auto-cleanup (default)
  python cleanup.py --dry-run          # Preview what would be cleaned
  python cleanup.py --confirm          # Ask for confirmation before cleanup
  python cleanup.py --verbose          # Show detailed output
"""

import os
import shutil
import sys
from pathlib import Path
from typing import List, Tuple

def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent

def get_directories_to_clean() -> List[Tuple[Path, str]]:
    """Get list of directories to clean with descriptions."""
    root = get_project_root()
    
    directories = [
        # Next.js build outputs
        (root / "apps" / "web" / "out", "Next.js export output"),
        (root / "apps" / "web" / "out.backup", "Next.js backup output"),
        (root / "apps" / "web" / "dist", "Distribution build"),
        (root / "apps" / "web" / ".next", "Next.js development cache"),
        
        # Node.js cache and modules
        (root / "apps" / "web" / "node_modules" / ".cache", "Node modules cache"),
        (root / "node_modules" / ".cache", "Root node modules cache"),
        
        # Test outputs
        (root / "apps" / "web" / "test-results", "Playwright test results"),
        (root / "apps" / "web" / "playwright-report", "Playwright HTML reports"),
        (root / "apps" / "web" / "coverage", "Test coverage reports"),
        
        # TypeScript build info
        (root / "apps" / "web" / "tsconfig.tsbuildinfo", "TypeScript build info"),
        (root / "tsconfig.tsbuildinfo", "Root TypeScript build info"),
        
        # Package manager caches
        (root / ".bun", "Bun cache directory"),
        (root / "apps" / "web" / ".bun", "Bun web app cache"),
        
        # Electron build artifacts
        (root / "apps" / "web" / "electron-builder-cache", "Electron builder cache"),
        (root / "apps" / "web" / "electron-dist", "Electron distribution"),
        
        # Log files
        (root / "apps" / "web" / "prod.log", "Production log file"),
        (root / "apps" / "web" / "temp-next-error.txt", "Temporary Next.js error log"),
        (root / "apps" / "web" / "temp-next-output.txt", "Temporary Next.js output log"),
        
        # Development artifacts
        (root / "apps" / "web" / ".turbo", "Turbo cache"),
        (root / ".turbo", "Root Turbo cache"),
    ]
    
    return directories

def format_size(size_bytes: int) -> str:
    """Format file size in human readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"

def get_directory_size(path: Path) -> int:
    """Get total size of directory in bytes."""
    total = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                try:
                    total += os.path.getsize(filepath)
                except (OSError, FileNotFoundError):
                    continue
    except (OSError, PermissionError):
        pass
    return total

def clean_directory(path: Path, description: str, dry_run: bool = False) -> Tuple[bool, int]:
    """
    Clean a directory or file.
    
    Returns:
        Tuple of (success, size_freed)
    """
    if not path.exists():
        return True, 0
    
    try:
        if path.is_file():
            size = path.stat().st_size
            if not dry_run:
                path.unlink()
            print(f"  ✓ Removed file: {path.name} ({format_size(size)})")
            return True, size
        elif path.is_dir():
            size = get_directory_size(path)
            if not dry_run:
                shutil.rmtree(path)
            print(f"  ✓ Removed directory: {path.name} ({format_size(size)})")
            return True, size
    except PermissionError:
        print(f"  ✗ Permission denied: {path}")
        return False, 0
    except Exception as e:
        print(f"  ✗ Error cleaning {path}: {e}")
        return False, 0
    
    return True, 0

def main():
    """Main cleanup function."""
    print("🧹 OpenCut Project Cleanup Script")
    print("=" * 50)
    
    # Parse command line arguments
    dry_run = "--dry-run" in sys.argv or "-n" in sys.argv
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    # Default to auto-yes unless explicitly disabled
    auto_yes = not ("--no-auto" in sys.argv or "--confirm" in sys.argv)
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be deleted")
        print()
    
    # Get directories to clean
    directories_to_clean = get_directories_to_clean()
    
    # Check what exists
    existing_items = []
    total_size = 0
    
    print("📋 Scanning for items to clean...")
    for path, description in directories_to_clean:
        if path.exists():
            size = get_directory_size(path) if path.is_dir() else path.stat().st_size
            existing_items.append((path, description, size))
            total_size += size
            if verbose:
                print(f"  Found: {description} - {format_size(size)}")
    
    if not existing_items:
        print("✨ Nothing to clean! Project is already clean.")
        return
    
    print(f"\n📊 Found {len(existing_items)} items totaling {format_size(total_size)}")
    
    if not dry_run and not auto_yes:
        # Confirm before proceeding
        response = input("\n❓ Proceed with cleanup? (y/N): ").strip().lower()
        if response not in ['y', 'yes']:
            print("❌ Cleanup cancelled.")
            return
    elif auto_yes and not dry_run:
        print("\n🚀 Auto-proceeding with cleanup (default behavior, use --confirm to prompt)...")
    
    print(f"\n🚀 {'Simulating' if dry_run else 'Starting'} cleanup...")
    
    # Clean each item
    total_freed = 0
    success_count = 0
    
    for path, description, size in existing_items:
        print(f"\n🗂️  {description}")
        success, freed = clean_directory(path, description, dry_run)
        if success:
            total_freed += freed
            success_count += 1
    
    # Summary
    print("\n" + "=" * 50)
    print("📈 Cleanup Summary:")
    print(f"  • Items processed: {len(existing_items)}")
    print(f"  • Successful: {success_count}")
    print(f"  • Failed: {len(existing_items) - success_count}")
    print(f"  • Space {'would be ' if dry_run else ''}freed: {format_size(total_freed)}")
    
    if dry_run:
        print(f"\n💡 Run without --dry-run to actually clean these files")
    else:
        print(f"\n✅ Cleanup completed! Freed {format_size(total_freed)} of disk space.")
        print("\n🎯 Next steps:")
        print("  • Run 'bun install' to reinstall dependencies if needed")
        print("  • Run 'bun run dev' to start development server")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Cleanup interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)