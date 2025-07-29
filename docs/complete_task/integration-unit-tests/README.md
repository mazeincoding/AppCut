# Integration Unit Tests - Archived ❌

These complex integration unit tests were moved from the E2E test directory as they are not suitable for E2E testing.

## Files Moved (January 2025):

### Integration Test Files:
- `analytics-integration.test.ts` - Analytics tracking unit tests with extensive mocking
- `audio-delay-compensation.test.ts` - Audio processing unit tests with AudioContext mocking

## Why These Were Not Useful:

### 1. **Heavy Mocking Anti-Pattern**
```typescript
// Example of extensive mocking in analytics test:
global.gtag = mockAnalytics;
global.analytics = { track: mockAnalytics, identify: mockAnalytics };
jest.mock('@/lib/export-engine');
jest.mock('@/lib/analytics-service');
```

### 2. **Internal Implementation Testing**
- Tests low-level audio processing functions
- Tests analytics tracking implementation details
- No user-facing behavior validation
- Complex technical concepts not accessible through UI

### 3. **Not E2E Compatible**
- E2E tests should interact with real browser APIs
- These tests mock AudioContext, performance APIs, etc.
- No actual user workflow testing
- Focus on unit-level implementation details

## Better E2E Approach:

Instead of testing implementation details, E2E tests should:

1. **Test User-Observable Analytics**
   ```typescript
   // E2E approach
   await page.click('button:has-text("Export")')
   await page.selectOption('#format', 'mp4')
   await page.click('button:has-text("Start Export")')
   
   // Verify analytics calls were made (if needed)
   const analyticsRequests = await page.evaluate(() => window.dataLayer)
   expect(analyticsRequests.some(req => req.event === 'export_started')).toBe(true)
   ```

2. **Test User-Facing Audio Sync**
   ```typescript
   // E2E approach
   await page.setInputFiles('#video-upload', 'test-video.mp4')
   await page.setInputFiles('#audio-upload', 'test-audio.mp3')
   
   // Test manual sync adjustment UI
   await page.dragAndDrop('.audio-track', '.timeline', { targetPosition: { x: 100, y: 0 } })
   await expect(page.locator('.sync-indicator')).toHaveText('25ms offset')
   
   // Test auto-sync feature
   await page.click('button:has-text("Auto Sync")')
   await expect(page.locator('.sync-status')).toHaveText('Synchronized')
   ```

3. **Test Real Export Functionality**
   - Upload real media files
   - Use actual export controls
   - Download and verify real exported files
   - Test error states through UI interactions

## Original Purpose:

### Analytics Integration Test:
- Tested analytics event tracking during exports
- Verified performance metrics collection
- Tested error reporting and user engagement tracking
- Tested browser compatibility analytics

### Audio Delay Compensation Test:
- Tested automatic audio offset detection
- Verified manual sync adjustment controls
- Tested adaptive compensation algorithms
- Tested edge cases and failure handling

## Why Not Converted:

1. **Implementation vs Behavior**: Unit tests verify implementation, E2E tests verify user experience
2. **Mocking vs Reality**: E2E tests should use real browser APIs, not mocked versions
3. **Technical Complexity**: Audio processing details aren't testable through UI interactions
4. **Maintenance Overhead**: These tests require deep technical knowledge to maintain

## Recommendation:

For testing these features in OpenCut:

### Analytics Testing:
- Use E2E tests to verify user actions trigger exports
- Test export completion through UI feedback
- Monitor actual network requests if analytics validation needed
- Focus on user-observable export functionality

### Audio Sync Testing:
- Test audio/video upload through file inputs
- Verify sync controls are accessible and functional
- Test manual offset adjustment through UI sliders/controls
- Verify export includes properly synchronized audio
- Test with real media files, not mocked audio contexts

These files demonstrate the difference between unit testing (implementation details) and E2E testing (user behavior).