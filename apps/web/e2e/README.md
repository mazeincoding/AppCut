# E2E Testing Setup for OpenCut

## Overview

This directory contains End-to-End (E2E) tests for OpenCut using Playwright. The tests verify that the application works correctly from a user's perspective across different scenarios.

## Setup Complete ✅

The E2E testing environment has been successfully configured with:

- **Playwright Test Framework**: Latest version with TypeScript support
- **Browser Support**: Chromium (Firefox/WebKit available but may require additional deps)
- **Page Object Models**: Structured test organization for maintainability
- **Test Fixtures**: Sample data and reusable test components
- **Helper Utilities**: Common functions for test setup and assertions

## Directory Structure

```
e2e/
├── ai-tests/                           # AI video generation tests
│   ├── ai-model-selection-bug-reproduction.spec.js
│   ├── check-video-status.spec.js
│   └── manual-video-generation-test.spec.js
├── export-tests/                       # Video export functionality tests
│   ├── audio-only-export.spec.ts
│   ├── basic-export.spec.ts
│   ├── export-cancellation.spec.ts
│   ├── format-compatibility.spec.ts
│   ├── long-video-export.spec.ts
│   ├── mixed-media-export.spec.ts
│   ├── progress-tracking.spec.ts
│   ├── quality-presets.spec.ts
│   └── video-only-export.spec.ts
├── media-tests/                        # Media processing and thumbnails
│   ├── enhanced-video-thumbnails.spec.ts
│   ├── generation-test.spec.ts
│   ├── image-adjustment-core.spec.ts
│   ├── post-generation-debug.spec.ts
│   ├── real-image-test.spec.ts
│   ├── video-thumbnail-demo.spec.ts
│   └── video-thumbnail-manual-test.spec.ts
├── navigation-tests/                   # Navigation and routing tests
│   ├── electron-navigation.spec.ts
│   └── navigation-bug-fix-test.spec.ts
├── timeline-tests/                     # Timeline functionality tests
│   ├── debug-timeline.js
│   ├── test-drag-to-timeline.js
│   ├── test-existing-timeline.js
│   ├── test-final-drag.js
│   ├── test-find-media-item.js
│   ├── test-timeline-gradient.js
│   └── test-with-video.js
├── ui-tests/                          # UI component and dialog tests
│   ├── export-dialog-spacing.spec.ts
│   ├── fullscreen-bug-test.spec.ts
│   └── setup-verification.spec.ts
├── video-export-tests/                # Comprehensive video export testing
│   ├── docs/
│   ├── input/
│   ├── output/
│   ├── scripts/
│   └── README.md
├── performance-tests/                 # Performance and benchmark tests
│   ├── benchmarks/
│   ├── parallel/
│   ├── performance/
│   ├── webcodecs/
│   └── README.md
├── fixtures/                          # Test data and page objects
│   ├── test-data.ts
│   └── page-objects.ts
├── helpers/                           # Test utilities and debug scripts
│   ├── debug-scripts/                 # Archived debugging utilities
│   └── test-helpers.ts
├── results/                           # Test execution results
└── README.md                          # This file
```

## Key Features

### 🎯 Test Data Fixtures
- Sample video, audio, and image files
- Pre-configured project templates (simple & complex)
- Export settings for different formats and qualities
- User scenarios for different user types

### 🏗️ Page Object Models
- `HomePage`: Landing page interactions
- `AuthPage`: Login/signup functionality  
- `EditorPage`: Main editor interface
- `ExportDialog`: Export settings and process
- `MediaLibraryPanel`: File management

### 🛠️ Test Helpers
- Browser API mocking for test environment
- File upload simulation
- Performance monitoring
- Network request tracking
- Responsive design testing
- Cleanup utilities

## Running Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI mode (interactive)
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Debug mode (step through tests)
bun run test:e2e:debug

# Run specific test file
bun run test:e2e setup-verification.spec.ts
```

## Test Environment Requirements

### Minimum Requirements ✅
- Node.js/Bun runtime
- Chromium browser (auto-installed)
- Next.js dev server (auto-started)

### Full Browser Support (Optional)
For Firefox and WebKit testing, install additional dependencies:
```bash
sudo npx playwright install-deps
```

### Database Setup (Optional)
For full application testing, ensure PostgreSQL is running:
```bash
docker-compose up -d
```

## Test Categories

### 1. AI Tests (`ai-tests/`)
- AI video generation workflows
- Model selection and bug reproduction
- Video generation status checking
- Manual AI interaction testing

### 2. Export Tests (`export-tests/`) ✅
- **Basic Export Flow**: Opening dialog, setting options, triggering export
- **Video-Only Export**: Timeline with video elements, format exports
- **Audio-Only Export**: Audio mixing and output validation
- **Mixed Media Export**: Complex timelines (video + audio + text)
- **Quality Presets**: 1080p, 720p, 480p exports and validation
- **Format Compatibility**: MP4, WebM, MOV cross-browser testing
- **Progress Tracking**: Progress bar accuracy and real-time feedback
- **Long Video Export**: 30+ second timelines with performance monitoring
- **Export Cancellation**: Mid-export cancellation and cleanup

### 3. Media Tests (`media-tests/`)
- Video thumbnail generation and enhancement
- Image processing and adjustment
- Media file handling and validation
- Real image testing scenarios

### 4. Navigation Tests (`navigation-tests/`)
- Electron navigation functionality
- Routing and page transitions
- Navigation bug fixes and regression testing

### 5. Timeline Tests (`timeline-tests/`)
- Drag-and-drop functionality
- Timeline element manipulation
- Video timeline interactions
- Timeline gradient and visual effects

### 6. UI Tests (`ui-tests/`)
- Dialog spacing and layout
- Fullscreen functionality
- Setup verification and basic UI components
- Responsive design testing

### 7. Performance Tests (`performance-tests/`)
- WebCodecs performance benchmarking
- Parallel processing tests
- Video processing performance analysis
- Memory usage and optimization testing

### 8. Video Export Tests (`video-export-tests/`)
- Comprehensive export testing suite
- Performance analysis and reporting
- Large file handling and stress testing
- Export quality validation

## Configuration

### Playwright Config (`playwright.config.ts`)
- Base URL: `http://localhost:3000`
- Auto-start dev server
- Trace collection on retry
- HTML reporter
- Chromium-focused for reliability

### Test Data (`fixtures/test-data.ts`)
- Mock media files (video/audio/image)
- Sample project configurations
- Export setting presets
- User workflow scenarios

## Best Practices

### Test Organization
- Use Page Object Models for UI interactions
- Keep test data in fixtures
- Utilize helper functions for common operations
- Group related tests in describe blocks

### Test Reliability
- Wait for elements to be stable
- Use proper selectors (data-testid preferred)
- Mock browser APIs when needed
- Clean up after each test

### Performance
- Monitor memory usage during tests
- Track load times and performance metrics
- Test with realistic file sizes
- Verify resource cleanup

## Debugging

### Common Issues
1. **Browser launch failures**: Install deps with `npx playwright install-deps`
2. **Database connection errors**: Start PostgreSQL with `docker-compose up -d`
3. **Slow tests**: Check network conditions and reduce file sizes
4. **Flaky tests**: Add proper waits and element stability checks

### Debug Tools
- `--headed` flag to see browser
- `--debug` flag to step through tests
- Screenshots on failure
- Network request monitoring
- Console log capture

## Integration with CI/CD

The E2E tests are designed to work in CI environments:
- Headless by default
- Configurable browser selection
- Retry on failure
- HTML reports
- Minimal dependencies

## Next Steps

1. Complete remaining E2E test implementation (Tasks 4.2-4.10)
2. Add browser compatibility testing
3. Performance regression testing
4. Visual regression testing
5. Mobile device testing
6. Accessibility testing

The foundation is now ready for comprehensive E2E test development! 🚀