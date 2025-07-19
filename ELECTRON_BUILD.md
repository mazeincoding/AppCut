# OpenCut Electron Build Guide

## Quick Start

To build and test the Electron version of OpenCut, use the test script in the **root directory**:

```powershell
# From the OpenCut root directory
.\test-electron.ps1
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

## Manual Build Steps

If you prefer to run the steps manually:

```bash
# 1. Navigate to the web app directory
cd apps/web

# 2. Install dependencies
bun install

# 3. Build for Electron
bun run electron:build

# 4. Apply fixes for static export
node scripts/fix-electron-static-paths.js
node scripts/fix-electron-next-data.js

# 5. Test with Electron
bunx electron electron/main-simple.js

# 6. Package for distribution (optional)
bun run electron:dist:win
```

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
The build process includes scripts to fix static export issues. These run automatically when using `test-electron.ps1`.