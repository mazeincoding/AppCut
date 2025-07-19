# OpenCut Electron Build Guide

## Quick Start

To build and test the Electron version of OpenCut:

### Option 1: Using PowerShell Script (Recommended for Windows)
```powershell
# From the OpenCut root directory
.\test-electron.ps1
```

### Option 2: Manual Build Steps
```bash
# Navigate to the web app directory
cd apps/web

# Install dependencies
bun install

# Build for Electron
bun run electron:build

# Run the Electron app
bunx electron electron/main-simple.js
```

## Available Scripts

### In the root directory:
- `test-electron.ps1` - Main build and test script for Windows

### In apps/web/package.json:
- `bun run electron:build` - Build Next.js for Electron
- `bun run electron:dev` - Run Electron in development mode
- `bun run electron:pack` - Create unpacked Electron app
- `bun run electron:dist` - Create distributable (all platforms)
- `bun run electron:dist:win` - Create Windows distributable

## Verification Steps

After building, verify the navigation is working:

1. **Run the app**: `bunx electron electron/main-simple.js`
2. **Test navigation**:
   - Click "Projects" button on home page → Should navigate to projects page
   - Click "OpenCut" logo → Should return to home page
   - Create/open a project → Should navigate to editor
3. **Check DevTools**: Press F12 to open DevTools and check for any errors

## Navigation Script Setup

If you need to manually set up the navigation fix:

```bash
# Copy the navigation fix script (from apps/web directory)
node scripts/copy-nav-fix.js
```

This copies the navigation fix script to the output directory for proper path resolution.

## Cross-Platform Building

Currently, the build scripts are optimized for Windows. For other platforms:

- **macOS**: Use `bun run electron:dist` (will auto-detect platform)
- **Linux**: Use `bun run electron:dist` (will auto-detect platform)

## Troubleshooting

### "Script not found" error
Make sure you're running from the correct directory:
- `test-electron.ps1` should be run from the OpenCut root
- npm/bun scripts should be run from `apps/web`

### Build fails
Try cleaning the build directories:
```powershell
.\test-electron.ps1 -CleanBuild
```

### Navigation errors in Electron
The build process now uses native Next.js relative paths instead of post-processing scripts.

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
- **Removed post-processing scripts**: No longer need fragile workarounds
- **Native relative paths**: Next.js generates proper relative paths using `assetPrefix: "./"` 
- **Robust protocol handler**: Simplified app:// protocol handler for consistent asset loading
- **Cleaner build process**: Single command builds and exports without manual path fixes

## Keyboard Shortcuts

- **F12** - Toggle Developer Tools
- **Ctrl+Shift+I** - Toggle Developer Tools (alternative)
- **Ctrl+R** - Reload page
- **Ctrl+Shift+R** - Force reload (clear cache)