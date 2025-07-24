# OpenCut Electron Build Guide

## Quick Start

To build and test the Electron version of OpenCut:

### Option 1: Dev Mode (Recommended)
```powershell
# Quick start - just run this script
& 'c:\Users\zdhpe\Desktop\New folder\OpenCut\electron-dev.ps1'
```

### Option 2: Manual Steps
```bash
# Start dev server first
cd apps/web
bun run dev

# Then in another terminal, start Electron with correct port
bunx electron electron/main.js --port=3001
```

## Available Scripts

- `electron-dev.ps1` - Dev mode with hot reload
- `bun run dev` - Start localhost server (auto-detects available port)
- `bun run export:electron` - Build for production
- `bun run electron:dist` - Create distributable

## Testing

1. Run `bunx electron electron/main-simple.js`
2. Test navigation between pages
3. Press F12 for DevTools

## Build Process Scripts

The build process automatically runs several scripts in the `apps/web/scripts/` folder:

1. **fix-electron-paths-robust.js** - Converts relative paths to app:// protocol
2. **electron-editor-fix.js** - Removes blocking scripts from editor HTML
3. **copy-nav-fix.js** - Copies navigation fix to output directory

These scripts are automatically executed during `bun run export:electron`.

## Cross-Platform Building

Currently, the build scripts are optimized for Windows. For other platforms:

- **macOS**: Use `bun run electron:dist` (will auto-detect platform)
- **Linux**: Use `bun run electron:dist` (will auto-detect platform)

## Troubleshooting

### "Script not found" error
Make sure you're running from the correct directory:
- PowerShell scripts should be run from the OpenCut root using `powershell -ExecutionPolicy Bypass -File script.ps1`
- npm/bun scripts should be run from `apps/web`

### Build fails
Try cleaning the build directories:
```bash
# From apps/web directory
rm -rf out
bun run export:electron
```

### Navigation errors in Electron
The build process uses:
- Native Next.js relative paths with `assetPrefix: "./"`
- Post-processing scripts to fix remaining path issues
- Navigation fix script for dynamic route handling

## Important Scripts Folder

The `apps/web/scripts/` folder contains critical build scripts that make Electron work properly:

### Core Build Scripts:
- **build-electron.js** - Main build orchestrator for Electron
- **fix-electron-paths-robust.js** - Converts relative paths to app:// protocol for assets
- **electron-editor-fix.js** - Removes blocking scripts that prevent React rendering
- **copy-nav-fix.js** - Copies navigation handler to output directory

### Utility Scripts:
- **run-electron-with-logs.js** - Debug wrapper with enhanced logging
- **validate-electron-urls.js** - Validates URLs in build output
- **test-build.js** - Build verification script
- **dev-electron.js** - Development mode runner

These scripts are essential for:
- Fixing path resolution issues in static HTML
- Removing code that blocks React hydration
- Enabling proper navigation between pages
- Debugging build and runtime issues

## Recent Improvements

### Navigation System (Fixed)
- **✅ Navigation Fix**: All navigation between pages now works correctly in Electron
- **✅ Dynamic Routes**: Proper handling of dynamic routes like `/editor/project/[id]`
- **✅ Home → Projects**: Navigation from home page to projects page works seamlessly
- **Key Files**:
  - `electron/navigation-fix.js` - Handles path resolution for static HTML files
  - `electron/preload-simplified.js` - Sets up IPC bridge and initial navigation patches
  - `electron/main-simple.js` - Main process with DevTools shortcuts (F12, Ctrl+Shift+I)

### Build System
- **Automated post-processing**: Scripts automatically fix paths after build
- **Native relative paths**: Next.js generates proper relative paths using `assetPrefix: "./"`
- **Robust protocol handler**: app:// protocol handler for consistent asset loading
- **Script pipeline**: `export:electron` runs build → fix paths → remove blocking scripts → copy navigation fix

## Keyboard Shortcuts

- **F12** - Toggle Developer Tools
- **Ctrl+Shift+I** - Toggle Developer Tools (alternative)
- **Ctrl+R** - Reload page
- **Ctrl+Shift+R** - Force reload (clear cache)