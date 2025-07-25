# Package.json Documentation: `package.json`

This document describes the `package.json` file located in the root directory of the OpenCut project. This file is central to managing the project's dependencies, scripts, and metadata.

## Overview

`package.json` is a manifest file for Node.js projects. It contains metadata about the project, such as its name, version, and description, as well as a list of its dependencies and scripts for automating various tasks.

## Configuration Details

```json
{
  "name": "opencut",
  "type": "commonjs",
  "packageManager": "bun@1.2.18",
  "devDependencies": {
    "turbo": "^2.5.4"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun run dev:web & bun run dev:electron",
    "build": "bun run build:web && bun run build:electron",
    "build:web": "turbo run build",
    "build:electron": "cd apps/web && bun run build:electron",
    "dev:web": "turbo run dev",
    "dev:electron": "cd apps/web && bun run electron:dev",
    "electron:dist:win": "cd apps/web && bunx electron-builder --win",
    "check-types": "turbo run check-types",
    "lint": "turbo run lint",
    "format": "turbo run format"
  },
  "dependencies": {
    "@types/jszip": "^3.4.1",
    "jszip": "^3.10.1",
    "next": "^15.3.4",
    "playwright": "^1.54.1",
    "wavesurfer.js": "^7.9.8"
  }
}
```

## Sections Explained

*   `name`: The name of the project (`opencut`).
*   `type`: Specifies the module system used (`commonjs`).
*   `packageManager`: Indicates the preferred package manager and its version (`bun@1.2.18`).

### `devDependencies`

Lists packages required only for development and testing.

*   `turbo`: A high-performance build system for JavaScript and TypeScript monorepos.

### `workspaces`

Defines the monorepo structure, indicating that `apps/` and `packages/` directories contain separate sub-projects or packages.

### `scripts`

Defines a set of runnable scripts for common tasks.

*   `dev`: Runs both the web and Electron development servers concurrently.
*   `build`: Builds both the web and Electron applications.
*   `build:web`: Runs the `build` script for the web application using Turbo.
*   `build:electron`: Navigates into the `apps/web` directory and runs its `build:electron` script.
*   `dev:web`: Runs the `dev` script for the web application using Turbo.
*   `dev:electron`: Navigates into the `apps/web` directory and runs its `electron:dev` script.
*   `electron:dist:win`: Navigates into `apps/web` and uses `electron-builder` to create a Windows distributable.
*   `check-types`: Runs type checking across the monorepo using Turbo.
*   `lint`: Runs linting across the monorepo using Turbo.
*   `format`: Runs code formatting across the monorepo using Turbo.

### `dependencies`

Lists packages required for the application to run in production.

*   `@types/jszip`: TypeScript type definitions for `jszip`.
*   `jszip`: A library for creating, reading, and editing `.zip` files.
*   `next`: The Next.js framework for building React applications.
*   `playwright`: A Node.js library to automate Chromium, Firefox and WebKit with a single API (likely used for E2E testing).
*   `wavesurfer.js`: A customizable waveform visualization library.

## Purpose

This `package.json` file serves as the central configuration for the OpenCut monorepo. It defines how the project's various applications and packages are managed, built, and run, ensuring consistency and streamlining development workflows.