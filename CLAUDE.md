# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: MCP Tool Usage
**Only use MCP tools (mcp__*) when the user explicitly asks for browser automation, web navigation, or similar tasks. For regular development work, use standard file operations, bash commands, and code analysis tools.**

## Quick Reference

For detailed project overview and development guidelines, refer to the **Cursor Rules** at:
- `/.cursor/rules/` - Comprehensive project documentation and guidelines
  - `project-structure.mdc` - Project overview, structure, and key technologies
  - `video-editor.mdc` - Video editor specific development guidelines
  - `typescript-react.mdc` - TypeScript and React best practices
  - `testing.mdc` - Testing strategies and patterns
  - `database-auth.mdc` - Database and authentication guidelines
  - `api-utilities.mdc` - API and utility development patterns
  - `build-deployment.mdc` - Build and deployment instructions

## Overview

OpenCut is a privacy-focused, open-source web-based video editor that runs entirely in the browser. It's designed as a free alternative to CapCut with the core principle that "your videos stay on your device."

## Architecture

### Monorepo Structure
This is a **Turborepo monorepo** with the following structure:
- `apps/web/` - Main Next.js 15 application
- `packages/auth/` - Authentication package (`@opencut/auth`)
- `packages/db/` - Database package (`@opencut/db`)

### Technology Stack
- **Framework**: Next.js 15 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with multiple specialized stores
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with Google OAuth support
- **Video Processing**: FFmpeg.js v0.12.15 for client-side video processing
- **Storage**: Hybrid approach using OPFS + IndexedDB for privacy
- **Build Tool**: Turborepo with Bun package manager

### Key State Management Stores
- `editor-store.ts` - Canvas settings and editor initialization
- `project-store.ts` - Project CRUD operations and metadata
- `timeline-store.ts` - Timeline tracks, elements, and editing operations
- `media-store.ts` - Media file management and storage
- `playback-store.ts` - Video playback controls and timing

### Storage Architecture
OpenCut uses a **hybrid client-side storage system** for privacy:
- **OPFS (Origin Private File System)**: Large media files
- **IndexedDB**: Project metadata and timeline data
- **No server uploads**: All processing happens in the browser

## Development Commands

### Setup (Required)
```bash
# 1. Start database services (PostgreSQL + Redis)
docker-compose up -d

# 2. Navigate to web app
cd apps/web

# 3. Copy environment file
cp .env.example .env.local

# 4. Install dependencies
bun install

# 5. Run database migrations
bun run db:migrate

# 6. Start development server
bun run dev

# 7. Start AI video generator service (optional)
cd services/ai-video-generator
source venv/bin/activate && source .env && python main.py
```

### Common Development Tasks
```bash
# From project root
turbo run dev          # Start all apps in development mode
turbo run build        # Build all apps
turbo run lint         # Lint all packages
turbo run format       # Format code with Biome
turbo run check-types  # Type check all packages

# From apps/web/
bun run dev            # Start Next.js dev server
bun run build          # Build for production
bun run lint           # Lint web app
bun run db:generate    # Generate Drizzle schema
bun run db:migrate     # Run database migrations
bun run db:push:local  # Push schema to local DB
bun run db:push:prod   # Push schema to production DB
```

### Code Quality
```bash
# Format code (from apps/web/)
bunx biome format --write .

# Check linting
bun run lint
```

## Environment Configuration

### Required Environment Variables
```bash
# Database (matches docker-compose.yaml)
DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"

# Better Auth (generate secure secret)
BETTER_AUTH_SECRET="your-generated-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# Redis (matches docker-compose.yaml)
UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REDIS_REST_TOKEN="example_token"

# Development
NODE_ENV="development"

# RECOMMENDED: Enable FFmpeg offline video export for precise duration control
NEXT_PUBLIC_OFFLINE_EXPORT="true"
```

### Generate BETTER_AUTH_SECRET
```bash
# Cross-platform method
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use: https://generate-secret.vercel.app/32
```

## Key Architecture Patterns

### Timeline System
The timeline supports **multi-track editing** with the following structure:
- **Tracks**: Different types (media, text, audio) with drag-and-drop support
- **Elements**: Individual media items with trim/split/move operations
- **Playback**: Real-time preview with frame-accurate seeking
- **Persistence**: Auto-save to IndexedDB with undo/redo support

### Video Processing Pipeline
All video processing happens **client-side** using FFmpeg.js v0.12.15:
- **Thumbnail generation**: Create preview images for timeline
- **Video trimming**: Extract segments without re-encoding  
- **Format conversion**: Convert between video formats
- **Metadata extraction**: Get duration, resolution, frame rate
- **Audio separation**: Extract audio tracks from video
- **Offline export**: Frame-by-frame rendering with FFmpegVideoRecorder (enabled via `NEXT_PUBLIC_OFFLINE_EXPORT=true`)

### Canvas System
Supports multiple aspect ratios and export formats:
- **Presets**: 16:9, 9:16, 1:1, 4:3 with customizable dimensions
- **Real-time preview**: HTML-based rendering for performance
- **Export rendering**: Canvas-based frame capture for video export
- **Dual export modes**: MediaRecorder and FFmpeg offline rendering (FFmpeg recommended for precision)

## Database Schema

### Core Tables
- `users` - User authentication and profiles
- `projects` - Project metadata and settings
- `sessions` - Better Auth session management
- `waitlist` - Email collection for updates

### Security Features
- **Row-level security (RLS)** enabled on all tables
- **Proper foreign key constraints** for data integrity
- **Token-based authentication** with Better Auth

## Important File Locations

### Configuration Files
- `turbo.json` - Turborepo build configuration
- `apps/web/next.config.ts` - Next.js configuration
- `apps/web/tailwind.config.ts` - Tailwind CSS configuration
- `apps/web/tsconfig.json` - TypeScript configuration
- `biome.json` - Biome linter/formatter configuration

### Core Libraries
- `apps/web/src/lib/ffmpeg-utils.ts` - Video processing utilities (FFmpeg.js v0.12.15)
- `apps/web/src/lib/ffmpeg-video-recorder.ts` - Offline video export using FFmpeg
- `apps/web/src/lib/export-engine.ts` - Main export engine with dual recording modes
- `apps/web/src/lib/storage/` - Client-side storage system
- `apps/web/src/lib/time.ts` - Time formatting utilities

### Database
- `apps/web/migrations/` - Drizzle database migrations
- `packages/db/` - Database schemas and configuration

## Development Guidelines

### Code Style
- Use **Biome** for linting and formatting (not ESLint/Prettier)
- Follow **TypeScript strict mode** patterns
- Use **Zustand** for state management over Context API
- Implement **component-based architecture** with shadcn/ui

### Performance Considerations
- **Lazy load** heavy video processing components
- Use **Web Workers** for background processing tasks
- Implement **proper dependency arrays** to prevent unnecessary re-renders
- **Memory management** is crucial for large video files

### Privacy & Security
- **No server uploads**: All processing stays in browser
- **Validate all inputs** with Zod schemas
- **Use RLS** for database access control
- **Rate limiting** with Redis for API endpoints

## Common Issues & Solutions

### Database Connection Issues
- Ensure Docker services are running: `docker-compose up -d`
- Check DATABASE_URL matches docker-compose.yaml
- Run migrations: `bun run db:migrate`

### Video Processing Issues
- FFmpeg.js v0.12.15 loads from local files in `/public/ffmpeg/` (ffmpeg-core.js and ffmpeg-core.wasm)
- **Version compatibility**: Ensure core files match @ffmpeg/ffmpeg package version
- **API changes**: v0.12.15 uses `ffmpeg.on('log', callback)` instead of `ffmpeg.setLogger()`
- Large video files may require OPFS feature detection
- Browser compatibility varies for video codecs
- **Export modes**: MediaRecorder vs FFmpeg offline rendering (recommended: `NEXT_PUBLIC_OFFLINE_EXPORT=true`)
- **Export duration fix**: Export engine now uses timeline duration directly for accurate video length

### Build Issues
- Use **Bun** as package manager (not npm/yarn)
- Turborepo handles workspace dependencies automatically
- Check `turbo.json` for build task configuration

## Testing

OpenCut has comprehensive testing setup including:
- **Unit Tests**: Jest with React Testing Library for components and utilities
- **Integration Tests**: Complete test coverage for export engine and video processing
- **E2E Tests**: Playwright for end-to-end user workflows
- **FFmpeg Tests**: Test video processing utilities (note: FFmpeg.js v0.12.15 doesn't support Node.js)
- **Storage Tests**: Test operations with fake IndexedDB
- Run tests: `bun run test` (from apps/web/)

## Development Context

**For Claude Code**: When you need comprehensive project context or specific development guidelines, always refer to the `/.cursor/rules/` directory first. These files contain detailed, up-to-date information about:

- Project architecture and structure patterns
- Video editor specific implementation details
- Technology stack usage and best practices
- Testing strategies and implementation patterns
- Database schema and authentication flows
- Build and deployment procedures

The cursor rules provide more detailed context than this CLAUDE.md file and should be your primary reference for understanding project requirements and implementation patterns.

## Recent Updates

- **Export Duration Fix (2024)**: Resolved export duration mismatch - videos now match timeline duration exactly
  - Fixed `calculateActualVideoDuration()` to use timeline duration directly instead of recalculating
  - FFmpeg offline export provides frame-perfect duration control
  - Simplified timeline store logging for better debugging experience
- **FFmpeg.js v0.12.15**: Updated to latest version with new event-based API
- **Dual export modes**: MediaRecorder and FFmpeg offline rendering (FFmpeg recommended)
- **Core files updated**: Synchronized `/public/ffmpeg/` files with package version
- **Export engine enhanced**: Better frame timing and video duration handling

### Known Issues Fixed
- **Export Duration Mismatch**: Videos exported with wrong duration (15s instead of 3s) - RESOLVED
- **Timeline calculations**: Trim values causing incorrect duration calculations - RESOLVED
- **MediaRecorder precision**: Real-time recording causing duration variance - RESOLVED via FFmpeg mode