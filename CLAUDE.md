# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

All commands should be run from the `apps/web/` directory:

```bash
cd apps/web/

# Development
bun run dev          # Start development server with Turbopack
bun install          # Install dependencies (uses Bun as package manager)

# Building and Deployment  
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run Next.js linting

# Database Operations
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:push:local    # Push schema to local database
bun run db:push:prod     # Push schema to production database
```

## Code Architecture

### Technology Stack
- **Frontend**: Next.js 15 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with dark theme enforced
- **State Management**: Zustand stores for different domains
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with email/password and Google OAuth
- **Video Processing**: FFmpeg via WebAssembly (@ffmpeg/ffmpeg, @ffmpeg/core)
- **UI Components**: Custom components built on Radix UI primitives
- **Code Formatting**: Biome with tab indentation and double quotes

### State Management Architecture
The application uses multiple Zustand stores for different concerns:
- `editor-store.ts` - Global editor initialization state
- `media-store.ts` - Media files and assets management
- `timeline-store.ts` - Timeline tracks, clips, and selections
- `playback-store.ts` - Video playback controls and state
- `project-store.ts` - Project-level data and settings
- `panel-store.ts` - UI panel visibility and layout

### Core Video Editor Components
- **Timeline** (`components/editor/timeline.tsx`) - Main timeline interface with drag-drop support for media files
- **Media Panel** (`components/editor/media-panel.tsx`) - Media library and asset management
- **Preview Panel** (`components/editor/preview-panel.tsx`) - Video preview and playback
- **Properties Panel** (`components/editor/properties-panel.tsx`) - Clip and effect properties

### Authentication & Database
- Uses Better Auth with Drizzle adapter for PostgreSQL
- Database schema defined in `src/lib/db/schema.ts`
- Supports email/password and Google OAuth authentication
- Environment-specific configuration (local/production)

### Video Processing
- Client-side video processing using FFmpeg WebAssembly
- FFmpeg files served from `public/ffmpeg/` directory
- Media processing utilities in `src/lib/ffmpeg-utils.ts` and `src/lib/media-processing.ts`

## File Structure Conventions
- Components organized by domain in `src/components/`
- UI primitives in `src/components/ui/` (shadcn/ui style)
- Custom hooks in `src/hooks/`
- Utilities and API logic in `src/lib/`
- Type definitions in `src/types/`
- App Router pages in `src/app/`

## Development Notes
- The app enforces dark theme (`forcedTheme="dark"`)
- Uses Bun as the preferred package manager
- Biome handles formatting with tab indentation
- Database migrations are tracked in the `migrations/` directory
- Rate limiting implemented via Upstash Redis
- Analytics via Vercel Analytics and DataBuddy