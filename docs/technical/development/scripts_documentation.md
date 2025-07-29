# Scripts Documentation: `apps/web/scripts/`

This document provides an overview of the utility scripts located in the `apps/web/scripts/` directory. These scripts automate various development, build, and maintenance tasks, especially those related to the Electron desktop application.

## Script Architecture Overview

This diagram shows how the different scripts interact with each other and the development workflow:

```mermaid
graph TD
    A[Development] --> B[dev-electron.js]
    A --> C[run-electron-with-logs.js]
    
    D[Building] --> E[build-electron.js]
    E --> F[fix-electron-paths-robust.js]
    E --> G[copy-nav-fix.js]
    E --> H[electron-editor-fix.js]
    
    I[Testing] --> J[test-build.js]
    I --> K[validate-electron-urls.js]
    
    L[Web Application] --> M[Next.js Build]
    M --> N[Electron Packaging]
    N --> O[Distributable]
    
    P[Scripts Dependencies] --> Q[Node.js]
    P --> R[Electron Builder]
    P --> S[File System Operations]
    
    style A fill:#e1f5fe
    style D fill:#e8f5e8
    style I fill:#fff3e0
    style L fill:#f3e5f5
```

## High-Level Workflow: Electron Build Process

This diagram illustrates the typical steps and interactions involved in building the Electron desktop application, primarily orchestrated by `build-electron.js`.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant BuildScript as build-electron.js
    participant WebApp as Web Application (Next.js)
    participant PathFix as fix-electron-paths-robust.js
    participant NavFix as copy-nav-fix.js
    participant ElectronBuilder as electron-builder
    participant OS as Operating System

    Dev->>BuildScript: bun run build:electron
    BuildScript->>WebApp: bun run build (builds Next.js app)
    WebApp-->>BuildScript: Web app build artifacts (HTML, CSS, JS)
    BuildScript->>PathFix: Fix asset paths for Electron
    PathFix-->>BuildScript: Paths corrected
    BuildScript->>NavFix: Apply navigation fixes
    NavFix-->>BuildScript: Navigation fixes applied
    BuildScript->>ElectronBuilder: electron-builder (packages app)
    ElectronBuilder->>ElectronBuilder: Bundles web app with Electron runtime
    ElectronBuilder->>OS: Creates distributable (e.g., .exe, .dmg)
    ElectronBuilder-->>BuildScript: Build success/failure
    BuildScript-->>Dev: Reports build status
```

## Individual Script Files and Their Functionality

### `build-electron.js`

This script is responsible for orchestrating the build process of the Electron desktop application. It handles:
- Compiling the web application
- Packaging it with Electron
- Generating distributable installers for different operating systems
- **Status**: ✅ Working for Windows builds (fixed January 2025)

### `dev-electron.js`

Development script that facilitates the Electron development workflow:
- Starts Electron app in development mode
- Enables hot-reloading
- Provides developer tools access
- Enhanced logging for debugging

### `run-electron-with-logs.js`

Enhanced version of the development script with comprehensive logging:
- Captures detailed output from main and renderer processes
- Useful for debugging complex issues
- Provides structured log output

### `fix-electron-paths-robust.js`

**Critical script** for resolving Electron-specific path issues:
- Fixes asset path resolution (images, fonts, CSS)
- Handles relative vs absolute path conflicts
- Ensures resources load correctly in Electron environment
- **Status**: ✅ Enhanced for Windows compatibility

### `copy-nav-fix.js`

Navigation fix deployment script:
- Copies navigation-related patches to correct locations
- Addresses known Electron navigation issues
- Part of the build process automation

### `electron-editor-fix.js`

Editor-specific patches for Electron environment:
- Resolves rendering issues in the video editor
- Performance optimizations for Electron
- Component compatibility fixes

### `test-build.js`

Build validation and testing script:
- Runs automated tests against packaged application
- Verifies feature functionality post-build
- Integration testing for Electron-specific features

### `validate-electron-urls.js`

URL validation and security script:
- Validates URL patterns for Electron app:// protocol
- Prevents navigation errors
- Security vulnerability prevention
- Path sanitization

## Script Dependencies and Relationships

```mermaid
graph LR
    A[Package.json Scripts] --> B[build-electron.js]
    A --> C[dev-electron.js]
    
    B --> D[Next.js Build]
    B --> E[Electron Builder]
    B --> F[Path Fixes]
    
    F --> G[fix-electron-paths-robust.js]
    F --> H[copy-nav-fix.js]
    F --> I[electron-editor-fix.js]
    
    J[Development] --> C
    C --> K[run-electron-with-logs.js]
    
    L[Testing] --> M[test-build.js]
    L --> N[validate-electron-urls.js]
    
    O[File System] --> P[Asset Management]
    Q[Electron APIs] --> R[Platform Integration]
    
    style A fill:#e1f5fe
    style B fill:#e8f5e8
    style J fill:#fff3e0
    style L fill:#f3e5f5
```

## Usage Commands

Common commands for running these scripts:

```bash
# Development
bun run dev:electron          # Start Electron development
node scripts/run-electron-with-logs.js  # Development with logs

# Building
bun run build:electron        # Build Electron application
node scripts/build-electron.js  # Direct build script

# Testing
node scripts/test-build.js    # Test built application
node scripts/validate-electron-urls.js  # Validate URLs

# Maintenance
node scripts/fix-electron-paths-robust.js  # Fix path issues
node scripts/copy-nav-fix.js  # Apply navigation fixes
```

## Recent Improvements (January 2025)

### ✅ Windows Electron Build Success
- **FIXED**: All Windows Electron build issues resolved
- **IMPROVED**: Path resolution for Windows file systems
- **ENHANCED**: Build process reliability and error handling

### ✅ Script Enhancements
- **UPDATED**: Robust path fixing for cross-platform compatibility
- **IMPROVED**: Logging and debugging capabilities
- **FIXED**: Navigation issues in Electron environment

### Script Integration Flow

```mermaid
flowchart TD
    A[Developer Makes Changes] --> B{Development or Build?}
    
    B -->|Development| C[dev-electron.js]
    B -->|Build| D[build-electron.js]
    
    C --> E[Hot Reload]
    C --> F[Debug Logging]
    
    D --> G[Path Fixes]
    D --> H[Asset Processing]
    D --> I[Electron Packaging]
    
    G --> J[fix-electron-paths-robust.js]
    H --> K[copy-nav-fix.js]
    I --> L[electron-editor-fix.js]
    
    M[Quality Assurance] --> N[test-build.js]
    N --> O[validate-electron-urls.js]
    
    P[Final Output] --> Q[Distributable Application]
    
    style A fill:#e1f5fe
    style D fill:#e8f5e8
    style M fill:#fff3e0
    style P fill:#f3e5f5
```

## Best Practices

1. **Always test scripts** on development builds before using in production
2. **Check logs** when builds fail - most issues are path-related
3. **Run validation** scripts after major changes
4. **Keep scripts updated** with Electron version changes
5. **Document custom fixes** for future maintenance