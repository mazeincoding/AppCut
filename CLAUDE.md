# claude.md

git add commit push if modify more than 3 files or longer than 200 lines of a single file 

File Operation Security
Always use Read tool before Write or Edit operations
Use absolute paths only, prevent path traversal attacks

description: "OpenCut project structure and architecture guide"
---

Priority Hierarchy: Long-term maintainability > scalability > performance > short-term gains

Core Principles:

Systems Thinking: Analyze impacts across entire system
Future-Proofing: Design decisions that accommodate growth
Dependency Management: Minimize coupling, maximize cohesion

frontend: UI/UX and user-facing development

### Code Documentation
- Write self-documenting code with clear naming
- Add JSDoc comments for complex functions
- Document API interfaces and types
- Include usage examples for reusable components

# OpenCut Project Structure Guide

## Main Application Structure
- **Main Entry**: [apps/web/src/app/page.tsx](mdc:apps/web/src/app/page.tsx) - Landing page
- **Editor Entry**: [apps/web/src/app/editor/project/page.tsx](mdc:apps/web/src/app/editor/project/page.tsx) - Main video editor
- **Layout**: [apps/web/src/app/layout.tsx](mdc:apps/web/src/app/layout.tsx) - Root layout with providers

## Core Architecture Components

### State Management (Zustand Stores)
- [apps/web/src/stores/editor-store.ts](mdc:apps/web/src/stores/editor-store.ts) - Main editor state
- [apps/web/src/stores/timeline-store.ts](mdc:apps/web/src/stores/timeline-store.ts) - Timeline and playback state
- [apps/web/src/stores/export-store.ts](mdc:apps/web/src/stores/export-store.ts) - Video export state
- [apps/web/src/stores/media-store.ts](mdc:apps/web/src/stores/media-store.ts) - Media file management
- [apps/web/src/stores/project-store.ts](mdc:apps/web/src/stores/project-store.ts) - Project CRUD operations

### Video Processing Engine
- [apps/web/src/lib/export-engine.ts](mdc:apps/web/src/lib/export-engine.ts) - Main export pipeline
- [apps/web/src/lib/canvas-renderer.ts](mdc:apps/web/src/lib/canvas-renderer.ts) - Canvas-based video rendering
- [apps/web/src/lib/ffmpeg-video-recorder.ts](mdc:apps/web/src/lib/ffmpeg-video-recorder.ts) - FFmpeg integration
- [apps/web/src/lib/audio-mixer.ts](mdc:apps/web/src/lib/audio-mixer.ts) - Audio processing

### UI Components
- [apps/web/src/components/editor/](mdc:apps/web/src/components/editor/) - Editor-specific components
- [apps/web/src/components/ui/](mdc:apps/web/src/components/ui/) - Reusable UI components (shadcn/ui)
- [apps/web/src/components/export-dialog.tsx](mdc:apps/web/src/components/export-dialog.tsx) - Export configuration

### Electron Integration
- [apps/web/electron/main.js](mdc:apps/web/electron/main.js) - Electron main process
- [apps/web/electron/preload.js](mdc:apps/web/electron/preload.js) - Preload script for IPC
- [apps/web/src/lib/electron-detection.ts](mdc:apps/web/src/lib/electron-detection.ts) - Environment detection

### Database & Auth
- [packages/db/src/schema.ts](mdc:packages/db/src/schema.ts) - Database schema (Drizzle ORM)
- [packages/auth/src/](mdc:packages/auth/src/) - Authentication package
- [apps/web/src/lib/workspace-packages/](mdc:apps/web/src/lib/workspace-packages/) - Local auth/db adapters

### Testing Infrastructure
- [apps/web/e2e/](mdc:apps/web/e2e/) - End-to-end tests (Playwright)
- [apps/web/src/__tests__/](mdc:apps/web/src/__tests__/) - Unit tests (Jest)
- [test_video_export/](mdc:test_video_export/) - Performance testing scripts


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
