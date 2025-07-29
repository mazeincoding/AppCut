# Performance Unit Tests - Archived ❌

These Jest-based performance unit tests were moved from the E2E test directory as they simulate performance scenarios rather than test real user interactions.

## Files Moved (January 2025):

### Performance Test Files:
- `performance-config.ts` - Configuration for performance test thresholds and scenarios
- `export-speed.test.ts` - Simulated export speed benchmarking tests
- `memory-usage.test.ts` - Simulated memory monitoring during exports
- `setup-performance.test.ts` - Performance monitoring infrastructure setup tests

## Why These Were Not Suitable for E2E:

### 1. **Simulation vs Real Testing**
```typescript
// Unit test approach (simulation):
const simulateBasicExport = async () => {
  const phases = ['preparing', 'processing', 'encoding', 'finalizing']
  // Mock processing phases without real export
}

// Better E2E approach (real testing):
await page.setInputFiles('#video-upload', 'large-test-video.mp4')
const startTime = performance.now()
await page.click('button:has-text("Export")')
await page.waitForSelector('.export-complete', { timeout: 60000 })
const exportTime = performance.now() - startTime
expect(exportTime).toBeLessThan(30000) // Real timing assertion
```

### 2. **Jest Framework Dependencies**
- Uses Jest test framework instead of Playwright
- Relies on mocked performance monitoring classes
- Tests internal performance helper utilities
- No real browser performance measurement

### 3. **Mock-Based Testing**
- Uses `PerformanceMonitor` and `MemoryMonitor` mocks
- Simulates memory allocations instead of measuring real usage
- Tests performance monitoring infrastructure, not actual performance

## Valuable Concepts for E2E Performance Testing:

### ✅ **Performance Thresholds** (Reusable)
The configuration contains useful performance expectations:
```typescript
timingLimits: {
  pageLoad: 5000,        // 5 seconds max page load
  exportStart: 2000,     // 2 seconds max to start export  
  shortExport: 10000,    // 10 seconds max for short export
  longExport: 60000,     // 60 seconds max for long export
  uiResponse: 1000       // 1 second max UI response
}

memoryLimits: {
  baseline: 100,         // 100MB baseline
  warningThreshold: 200, // Warn if memory increases by 200MB
  errorThreshold: 500,   // Error if memory increases by 500MB
  maxHeapSize: 2000      // 2GB max heap
}
```

### ✅ **Performance Scenarios** (Convertible)
The test scenarios could be implemented as real E2E tests:
- Baseline memory measurement
- Timeline creation performance
- Video processing speed
- Export quality vs speed tradeoffs
- Memory stress testing

## Better E2E Performance Testing Approach:

### 1. **Real Export Performance Testing**
```typescript
// E2E performance test example
test('should export video within acceptable time limits', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Upload real test media
  await page.setInputFiles('#video-upload', 'test-assets/1080p-video.mp4')
  await page.setInputFiles('#audio-upload', 'test-assets/test-audio.mp3')
  
  // Measure export performance
  const exportStart = performance.now()
  await page.click('button:has-text("Export")')
  await page.selectOption('#quality', '720p')
  await page.click('button:has-text("Start Export")')
  
  // Wait for export completion with timeout
  await page.waitForSelector('.export-complete', { timeout: 60000 })
  const exportDuration = performance.now() - exportStart
  
  // Assert performance within acceptable limits
  expect(exportDuration).toBeLessThan(30000) // 30 seconds for test video
  
  // Verify export file was created
  const downloadPromise = page.waitForEvent('download')
  await page.click('button:has-text("Download")')
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.mp4$/)
})
```

### 2. **Real Memory Usage Testing**
```typescript
test('should not exceed memory limits during export', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Get baseline memory
  const baselineMemory = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0
  })
  
  // Perform memory-intensive operations
  await page.setInputFiles('#video-upload', 'large-video.mp4')
  await page.click('button:has-text("Export")')
  
  // Monitor memory during export
  const memoryDuringExport = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0
  })
  
  const memoryIncrease = memoryDuringExport - baselineMemory
  expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024) // 500MB limit
})
```

### 3. **Real UI Responsiveness Testing**
```typescript
test('should maintain UI responsiveness during processing', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Start heavy processing
  await page.setInputFiles('#video-upload', 'large-video.mp4')
  
  // Test UI responsiveness during processing
  const responseStart = performance.now()
  await page.click('button:has-text("Media")')
  await page.waitForSelector('.media-panel')
  const responseTime = performance.now() - responseStart
  
  expect(responseTime).toBeLessThan(1000) // UI should respond within 1 second
})
```

### 4. **Real Page Load Performance**
```typescript
test('should load editor page within performance budget', async ({ page }) => {
  const startTime = performance.now()
  await page.goto('/editor/project/new')
  await page.waitForLoadState('networkidle')
  const loadTime = performance.now() - startTime
  
  expect(loadTime).toBeLessThan(5000) // 5 second load budget
  
  // Verify core elements loaded
  await expect(page.locator('.timeline')).toBeVisible()
  await expect(page.locator('.preview-panel')).toBeVisible()
  await expect(page.locator('.media-panel')).toBeVisible()
})
```

## Recommendation:

The performance unit tests should be moved to complete_task, but the **performance testing concepts and thresholds** are valuable and should be implemented as **real E2E performance tests** that:

1. **Test Real User Workflows**: Upload real media, perform real exports
2. **Measure Actual Performance**: Use Playwright's built-in performance APIs
3. **Set Realistic Thresholds**: Based on actual application performance
4. **Test in Real Browsers**: Use real browser performance characteristics
5. **Validate User Experience**: Ensure performance doesn't impact usability

The configuration file contains useful performance budgets that could be adapted for real E2E performance testing in the `e2e/performance-tests/` directory.