# OpenCut Electron Build Guide

## Quick Start

To build and test the Electron version of OpenCut:

### Option 1: Using PowerShell Script (Windows - Currently has issues)
```powershell
# From the OpenCut root directory
.\test-electron.ps1
```
**Note**: The PowerShell script currently has path issues. Use Option 2 instead.

### Option 2: Manual Build Steps (Recommended)
```bash
# Navigate to the web app directory
cd apps/web

# Install dependencies
bun install

# Build for Electron (uses export:electron command)
bun run export:electron

# Run the Electron app
bunx electron electron/main-simple.js
```

## Available Scripts

### In the root directory:
- `test-electron.ps1` - Main build and test script for Windows

### In apps/web/package.json:
- `bun run export:electron` - Build Next.js for Electron (primary build command)
- `bun run electron:dev` - Run Electron in development mode
- `bun run electron:pack` - Create unpacked Electron app
- `bun run electron:dist` - Create distributable (all platforms)
- `bun run electron:dist:win` - Create Windows distributable
- `bun run postexport` - Post-processing scripts (automatically run after export)

## Verification Steps

After building, verify the navigation is working:

1. **Run the app**: `bunx electron electron/main-simple.js`
2. **Test navigation**:
   - Click "Projects" button on home page → Should navigate to projects page
   - Click "OpenCut" logo → Should return to home page
   - Create/open a project → Should navigate to editor
3. **Check DevTools**: Press F12 to open DevTools and check for any errors

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
- `test-electron.ps1` should be run from the OpenCut root
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