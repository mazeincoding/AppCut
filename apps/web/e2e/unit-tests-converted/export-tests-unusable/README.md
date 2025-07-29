# Export Tests - Unusable Due to Dependencies ❌

These E2E tests for export functionality were moved here because they have extensive dependencies on TestHelpers that no longer exist.

## Files Moved (January 2025):

### Export Test Suite:
- `audio-only-export.spec.ts` - Audio-only export functionality
- `basic-export.spec.ts` - Core export workflow testing
- `export-cancellation.spec.ts` - Export cancellation handling
- `format-compatibility.spec.ts` - Multiple format support testing
- `long-video-export.spec.ts` - Large file export testing
- `mixed-media-export.spec.ts` - Multi-track export testing
- `progress-tracking.spec.ts` - Export progress monitoring
- `quality-presets.spec.ts` - Quality setting validation
- `video-only-export.spec.ts` - Video-only export testing

## Issues Preventing Use:

### 1. **Heavy TestHelpers Dependencies**:
All tests extensively use TestHelpers class methods like:
- `helpers.mockBrowserAPIs()`
- `helpers.waitForAppLoad()`
- `helpers.cleanup()`
- `helpers.uploadMedia()`
- `helpers.verifyDownload()`

### 2. **Import Path Issues**:
- Wrong relative paths to fixtures (fixed, but TestHelpers still missing)
- References to non-existent helper classes

### 3. **Complex Test Architecture**:
These tests were designed for a comprehensive testing framework that doesn't exist in the current E2E setup.

## Original Purpose:

These tests were meant to provide comprehensive coverage of:
- **Export Workflow**: Full end-to-end export process testing
- **Format Support**: MP4, WebM, MOV format validation
- **Quality Settings**: Different resolution and bitrate testing
- **Progress Tracking**: Export progress and cancellation
- **Error Handling**: Export failures and recovery
- **Performance**: Large file and long-duration exports

## Why Not Fixed:

1. **Over-Engineered**: Tests assume complex helper infrastructure
2. **No Current Use**: Export functionality can be tested more simply
3. **Maintenance Burden**: Would require significant refactoring
4. **Simpler Alternatives**: Direct Playwright tests are more maintainable

## Alternative Approach:

For testing export functionality, create simple, focused tests that:
- Use direct Playwright APIs instead of helper classes
- Test specific export scenarios individually
- Focus on user interactions rather than infrastructure

## Status: **Unusable Without Major Refactoring**

These tests represent good intentions but require a different testing architecture than what's currently implemented in the E2E suite.