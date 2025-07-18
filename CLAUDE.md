# claude.md

Short and concise guide to Claude Code for OpenCut development.

## 📁 Reference Documentation
**Primary source**: `.cursor/rules/` directory contains comprehensive guidelines:

- **[project-structure.mdc](.cursor/rules/project-structure.mdc)** - Architecture, key files, stores
- **[electron-patterns.mdc](.cursor/rules/electron-patterns.mdc)** - Desktop app patterns
- **[development-workflow.mdc](.cursor/rules/development-workflow.mdc)** - Dev practices 
- **[component-organization.mdc](.cursor/rules/component-organization.mdc)** - UI patterns
- **[testing-patterns.mdc](.cursor/rules/testing-patterns.mdc)** - Testing conventions
- **[typescript-patterns.mdc](.cursor/rules/typescript-patterns.mdc)** - TS standards
- **[video-processing.mdc](.cursor/rules/video-processing.mdc)** - FFmpeg integration

## 🎯 OpenCut Stack
**Privacy-focused browser video editor:**
- Next.js 15 + React 18 + TypeScript
- Zustand stores, Tailwind CSS, shadcn/ui
- FFmpeg.js v0.12.15 (client-side processing)
- OPFS + IndexedDB storage (no uploads)
- Electron for desktop, PostgreSQL + Drizzle

## ⚡ Quick Commands
```bash
# Setup: docker-compose up -d && cd apps/web && bun install && bun run dev
# Electron: bun run export:electron && npx electron electron/main-simple.js
# Quality: bun run lint && bun run test
```

## 🏗️ Architecture
- `apps/web/src/` - Main app (app/, components/, stores/, lib/)
- `packages/` - Auth & DB packages
- Key patterns: Zustand stores, compound components, Canvas→FFmpeg pipeline

## 🔧 Recent: Windows Electron Build Fixed
All issues resolved (see `task11.md`). Navigation, rendering, window positioning working.

---
**Detailed guidance**: Always check `.cursor/rules/` files first for implementation patterns.
