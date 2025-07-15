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
├── fixtures/
│   ├── test-data.ts          # Sample media files and test scenarios
│   └── page-objects.ts       # Page Object Models for UI interactions
├── helpers/
│   └── test-helpers.ts       # Utility functions for tests
├── setup-verification.spec.ts # Basic setup verification tests
└── README.md                 # This file
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

### 1. Setup Verification ✅
- Basic page loading
- Browser API availability
- Responsive design
- Performance checks
- Error handling
- Cleanup verification

### 2. Planned Test Suites
Based on the task list, the following E2E tests will be implemented:

#### 4.2 Basic Export Flow
- Opening export dialog
- Setting export options
- Triggering export process

#### 4.3 Video-Only Export
- Timeline with video elements
- Different format exports
- Output file verification

#### 4.4 Audio-Only Export
- Timeline with audio elements
- Audio mixing verification
- Audio output validation

#### 4.5 Mixed Media Export
- Complex timelines (video + audio + text)
- Multi-element rendering
- Output quality verification

#### 4.6 Quality Presets
- 1080p, 720p, 480p exports
- File size comparisons
- Quality validation

#### 4.7 Format Compatibility
- MP4, WebM, MOV exports
- Cross-browser compatibility
- Format-specific features

#### 4.8 Progress Tracking
- Progress bar accuracy
- Status message updates
- Real-time feedback

#### 4.9 Long Video Export
- 30+ second timelines
- Performance monitoring
- Memory usage tracking

#### 4.10 Export Cancellation
- Mid-export cancellation
- Resource cleanup verification
- UI state recovery

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