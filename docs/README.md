# OpenCut Documentation

This directory contains comprehensive documentation for the OpenCut video editor project.

## Directory Structure

### 📁 **issues/**
Known issues, bug reports, and analysis
- `ai-video-no-timeline-preview-analysis.md` - AI video timeline preview analysis
- `ai-video-timeline-preview-fix.md` - AI video timeline preview fix
- `generated-images-export-issue.md` - Generated images export issue analysis
- `timeline-cursor-alignment-analysis.md` - Timeline cursor alignment analysis
- `video-thumbnail-generation-error.md` - Video thumbnail generation error analysis

### 📁 **technical/**
Technical configuration and setup documentation, organized by category:

#### 🏗️ **architecture/**
System architecture and component documentation
- `components_documentation.md` - React components documentation
- `lib_documentation.md` - Library functions documentation
- `preview-panel-component-documentation.md` - Preview panel component documentation
- `stores_documentation.md` - State management stores documentation
- `types_documentation.md` - TypeScript types documentation

#### 🚀 **deployment/**
Deployment and infrastructure documentation
- `docker_compose_documentation.md` - Docker Compose setup documentation
- `netlify_documentation.md` - Netlify deployment documentation

#### 🛠️ **development/**
Development tools and processes (consolidated)
- `development_documentation.md` - Unified development tools documentation (Biome, Drizzle migrations, Turborepo)

#### 📦 **packages/**
Package-specific documentation
- `packages_documentation.md` - Combined authentication and database package documentation

#### 🖥️ **platform/**
Platform-specific integrations
- `electron_documentation.md` - Electron application documentation

#### 📋 **project-info/**
Project-level information and configuration
- `package_json_documentation.md` - Package.json configuration documentation
- `project_documentation.md` - Overall project structure documentation

#### 🧪 **testing/**
Testing documentation and guides
- `e2e_documentation.md` - End-to-end testing documentation


## 🔍 **How to Use This Documentation**

1. **For Developers**: Start with `technical/project-info/project_documentation.md` for project overview
2. **For Issues**: Look in the `issues/` folder for known problems and solutions
3. **For Technical Setup**: Use `technical/` for configuration and technical guides:
   - `technical/architecture/` - System architecture and components
   - `technical/development/` - Development tools and processes (Biome, Drizzle, Turborepo)
   - `technical/deployment/` - Deployment and infrastructure setup
   - `technical/packages/` - Package-specific documentation
   - `technical/platform/` - Platform-specific integrations (Electron)
   - `technical/project-info/` - Project-level information
   - `technical/testing/` - Testing documentation (E2E)

## 📝 **Contributing to Documentation**

When adding new documentation:
- Place issue analysis in `issues/`
- Place technical configs in appropriate `technical/` subfolders:
  - Architecture docs in `technical/architecture/`
  - Development tools in `technical/development/`
  - Deployment guides in `technical/deployment/`
  - Package docs in `technical/packages/`
  - Platform integrations in `technical/platform/`
  - Project info in `technical/project-info/`
  - Testing docs in `technical/testing/`

Keep documentation up-to-date and well-organized for easy navigation and maintenance.