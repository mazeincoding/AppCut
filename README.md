# OpenCut

A free, open-source video editor that works completely offline in your browser.

## Why?

- **Privacy**: Your videos never leave your device - everything is processed client-side
- **Free features**: No paywalls, subscriptions, or account required
- **Simple**: Easy to use interface inspired by CapCut
- **Offline**: Works without internet connection once loaded

## Features

- Timeline-based editing
- Multi-track support
- Real-time preview
- Drag & drop media import
- No watermarks, accounts, or subscriptions
- Complete offline functionality

## Quick Start

### Web Version
```bash
cd apps/web
npm install
npm run dev
```

Visit `http://localhost:3000` and click "Start Editing" - no setup required!

### Desktop Version
```bash
cd apps/desktop
npm install
npm run dev
```

Creates a native desktop app experience.

## Architecture

OpenCut is designed as a **privacy-first, offline-capable** video editor:

- **No authentication required** - just start editing
- **Client-side processing** - your videos stay on your device
- **Optional database** - only needed for the waitlist feature on the website
- **No servers required** - the editor works completely offline

## Production Build

### Desktop App
```bash
cd apps/desktop
npm run build
```

Creates installers for MacOS and Windows.

### Web App
```bash
cd apps/web
npm run build
```

Generates a static site that can be hosted anywhere.

## Contributing

All contributions welcome! The core principle is to keep video editing completely client-side and privacy-focused.

## License

MIT [Details](LICENSE)
