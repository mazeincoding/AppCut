# App Router Backup Archive

## Overview
This folder contains the original **Next.js App Router** implementation that was used before the migration to **Pages Router** for Electron compatibility.

## Historical Context
- **Created**: July 23, 2025
- **Migration**: App Router → Pages Router (Commit: `194d6cf`)
- **Reason**: Electron compatibility issues with App Router
- **Status**: ✅ Successfully migrated to Pages Router

## Original Structure
This archive preserves the original App Router structure:

### 📁 Routes
- `(auth)/login/` - Login page with App Router auth groups
- `(auth)/signup/` - Signup page with App Router auth groups  
- `contributors/` - Contributors page
- `editor/project/` - Main video editor with dynamic routing
- `privacy/` - Privacy policy page
- `projects/` - Project management page
- `why-not-capcut/` - Marketing comparison page

### 📄 Configuration Files
- `layout.tsx` - App Router root layout
- `globals.css` - Global styles for App Router
- `metadata.ts` - SEO metadata configuration
- `page.tsx` - App Router homepage
- `generateStaticParams.ts` - Static generation config

## Migration Results
All functionality from this App Router implementation has been successfully migrated to:
- **Pages Router**: `apps/web/src/pages/`
- **Layouts**: `apps/web/src/pages/_app.tsx`
- **Styles**: `apps/web/src/styles/globals.css`

## Current Status
- **❌ Not Referenced**: No active code uses this folder
- **✅ Archived**: Preserved for historical reference
- **🔒 Safe to Keep**: No impact on current build or runtime

## Related Documentation
- Pages Router migration: `docs/complete_task/completed-tasks/nextjs-pages-router-migration-*.md`
- Electron compatibility: `docs/complete_task/electron-issues/`

---
*This archive was moved from `apps/web/src/app-backup/` on January 29, 2025*