# Unused Test Helpers - Moved from E2E Directory

## File: `unused-test-helpers.ts`

**Status**: Well-written but unused E2E test utility class

### What it contained:
A comprehensive `TestHelpers` class with 20+ utility methods for:

- **File Upload Testing**: Mock file uploads, temporary media file creation
- **Media Element Handling**: Video readiness checking, timeline assertions  
- **Browser API Mocking**: MediaRecorder, navigator.mediaDevices, OPFS, File API
- **Performance Testing**: Memory usage, load time, network request monitoring
- **User Simulation**: Realistic interaction delays, mouse movements
- **Debugging**: Screenshot capture, element stability checking
- **Cleanup**: Storage clearing, service worker cleanup

### Why it was moved:

1. **Not Used**: No E2E tests currently import or use the TestHelpers class
2. **Over-Engineered**: Very comprehensive but no actual implementation in test suite  
3. **Broken References**: Imports from `../fixtures/test-data` but tests use `../fixtures/test-utils` instead
4. **Redundant**: Some functionality overlaps with existing test utilities

### Potential Future Use:

The code is well-structured and could be valuable if:
- A more comprehensive E2E test suite is developed
- Advanced media testing scenarios are needed  
- Performance monitoring becomes required for tests
- Browser compatibility testing is expanded

### Current E2E Approach:

The project currently uses simpler, more focused utilities in:
- `fixtures/test-utils.ts` - Basic test file creation utilities
- Individual test files with inline helper functions
- Playwright's built-in capabilities for most interactions

### Recommendation:
Keep archived until E2E test strategy is reviewed. Could be repurposed if more advanced testing capabilities are needed in the future.