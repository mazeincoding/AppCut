# Unit Tests Converted to E2E Framework

This directory contains unit tests that were moved from `src/__tests__` to be converted into Playwright E2E tests.

## Status: Needs Conversion ⚠️

These Jest-based unit tests need to be converted to Playwright E2E tests to be usable.

## Key Test Files to Convert:

### High Priority:
- `lib/ffmpeg-utils.test.ts` - FFmpeg video processing pipeline tests
- `lib/canvas-renderer.test.ts` - Canvas rendering functionality tests  
- `integration/export-engine.test.ts` - Complete export workflow tests
- `utils/test-helpers.ts` - Mock utilities (convert to Playwright fixtures)

### Medium Priority:
- `lib/audio-mixer.test.ts` - Audio processing tests
- `lib/video-recorder.test.ts` - Video recording tests
- `components/export-*.test.tsx` - Component integration tests

## Conversion Notes:

1. **Replace Jest with Playwright**: Convert `describe/it/expect` to Playwright test syntax
2. **Replace Mocks with Real Browser APIs**: Use actual browser MediaRecorder, Canvas, etc.
3. **Use Playwright Fixtures**: Convert test-helpers to Playwright fixture system
4. **Integration Focus**: Convert unit tests to integration tests that verify end-to-end workflows

## Next Steps:

1. Convert high-priority test files one by one
2. Create Playwright fixtures for common test utilities
3. Test against real browser APIs instead of mocks
4. Move completed tests to appropriate E2E test directories
5. Delete this directory once conversion is complete

## Original Issues:
- Jest framework not configured in package.json
- Missing Jest dependencies
- Heavy mocking approach incompatible with E2E testing philosophy

## Files Moved to Archives:
- `export-tests-unusable/` - Moved to `docs/complete_task/` (January 2025)
  - These export tests had heavy TestHelpers dependencies and were deemed unusable without major refactoring