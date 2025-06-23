# OpenCut Desktop

Electron wrapper for the OpenCut web application.

## Development

To run the desktop app in development mode:

```bash
npm install
npm run dev
```

This will:
1. Start the web development server on localhost:3000
2. Wait for the server to be ready
3. Launch Electron pointing to the web server

## Production Build

To build a production desktop application:

```bash
npm install
npm run build
```

This will:
1. Set the `ELECTRON_BUILD=true` environment variable
2. Build the web app as a static export to `../web/out/`
3. Package the Electron app with electron-builder

The built applications will be in the `dist/` directory.

## Platform-specific Builds

- **macOS**: Creates a `.dmg` installer
- **Windows**: Creates an NSIS installer
- **Linux**: Creates an AppImage

## Configuration

The desktop app is configured via:
- `electron-builder.json` - Build and packaging settings
- `main.js` - Electron main process
- `package.json` - Dependencies and scripts

## Differences from Web Version

- No server-side database calls (uses static export)
- Shows "Start Editing" button instead of waitlist signup
- Includes security hardening for desktop environment 