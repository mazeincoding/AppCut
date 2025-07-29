# Unit Test Utils - Archived ❌

These Jest unit test utilities were moved from the E2E test directory as they provide mock objects and helpers for isolated unit testing, not E2E testing.

## Files Moved (January 2025):

### Utility Files:
- `test-helpers.ts` - Mock factories for Jest unit tests (canvas, export settings, timeline elements, DOM elements)
- `performance-helpers.ts` - Performance monitoring utilities for simulated performance tests

## Why These Were Not Suitable for E2E:

### 1. **Mock Factories vs Real Elements**
```typescript
// Unit test utility approach (mocking):
export function createMockCanvas(width = 1920, height = 1080): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function createMockVideoElement_DOM(): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: 1920 })
  return video
}
```

### 2. **Jest-Specific Testing Utilities**
- Mock factories for isolated component testing
- Jest mock functions (`jest.fn()`)
- Mock DOM elements with stubbed properties
- Performance simulation utilities, not real measurement

### 3. **Isolation vs Integration**
- Creates isolated mock objects for unit testing
- Tests components in isolation from their real environment
- E2E tests should use real browser elements and APIs

## Better E2E Approach:

Instead of mocking, E2E tests should use real elements and Playwright utilities:

### 1. **Real File Uploads Instead of Mock Elements**
```typescript
// E2E approach (real files)
test('should upload and process video file', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Use real video file
  await page.setInputFiles('#video-upload', 'test-assets/sample-video.mp4')
  
  // Verify real video element properties
  const videoElement = page.locator('video').first()
  await expect(videoElement).toBeVisible()
  
  // Get actual video dimensions
  const dimensions = await videoElement.evaluate(video => ({
    width: video.videoWidth,
    height: video.videoHeight,
    duration: video.duration
  }))
  expect(dimensions.width).toBeGreaterThan(0)
  expect(dimensions.height).toBeGreaterThan(0)
})
```

### 2. **Real Canvas Testing Instead of Mock Canvas**
```typescript
// E2E approach (real canvas)
test('should render content to canvas', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Upload real media
  await page.setInputFiles('#image-upload', 'test-assets/test-image.jpg')
  
  // Verify real canvas rendering
  const canvas = page.locator('canvas.preview')
  await expect(canvas).toBeVisible()
  
  // Verify canvas has actual content (non-blank)
  const hasContent = await canvas.evaluate(canvas => {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return imageData.data.some(pixel => pixel !== 0)
  })
  expect(hasContent).toBe(true)
})
```

### 3. **Real Performance Measurement Instead of Simulation**
```typescript
// E2E approach (real performance)
test('should complete export within performance budget', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Setup real timeline
  await page.setInputFiles('#video-upload', 'test-assets/short-video.mp4')
  await page.dragAndDrop('.video-item', '.timeline')
  
  // Measure real export performance
  const startTime = Date.now()
  await page.click('button:has-text("Export")')
  await page.click('button:has-text("Export Video")')
  
  // Wait for real export completion
  await page.waitForSelector('.export-complete', { timeout: 30000 })
  const exportDuration = Date.now() - startTime
  
  // Assert real performance
  expect(exportDuration).toBeLessThan(20000) // 20 seconds for test video
  
  // Measure real memory during export
  const memoryUsage = await page.evaluate(() => {
    return (performance as any).memory?.usedJSHeapSize || 0
  })
  expect(memoryUsage).toBeLessThan(500 * 1024 * 1024) // 500MB limit
})
```

### 4. **Playwright Built-in Utilities Instead of Custom Helpers**
```typescript
// E2E approach (Playwright utilities)
test('should handle timeline interactions', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Use Playwright's built-in utilities
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.timeline', { state: 'visible' })
  
  // Real drag and drop
  await page.dragAndDrop('.media-item', '.timeline-track')
  
  // Real timing utilities
  await page.waitForTimeout(1000)
  
  // Real element interactions
  await page.hover('.timeline-element')
  await page.click('.timeline-element', { button: 'right' })
  
  // Built-in assertions
  await expect(page.locator('.context-menu')).toBeVisible()
})
```

## Original Purpose:

### test-helpers.ts utilities were meant for:
- **Mock Canvas**: Creating fake canvas elements for isolated rendering tests
- **Mock Export Settings**: Generating test export configurations
- **Mock Timeline Elements**: Creating fake timeline data structures
- **Mock DOM Elements**: Stubbing video/image elements with fake properties
- **Mock Callbacks**: Creating Jest mocks for progress/error callbacks

### performance-helpers.ts utilities were meant for:
- **Performance Monitoring**: Simulating performance metric collection
- **Memory Monitoring**: Tracking simulated memory usage
- **Export Performance**: Measuring simulated export operations
- **Benchmark Utilities**: Running performance benchmarks on mocked operations

## Why Not Converted:

1. **Real vs Mock**: E2E tests should use real browser elements, not mocked ones
2. **Integration vs Isolation**: E2E tests verify full integration, not isolated components
3. **Playwright Built-ins**: Playwright provides better utilities for E2E testing
4. **Authentic Testing**: E2E tests should measure real performance, not simulated

## Recommendation:

For E2E testing utilities in OpenCut:

### Use Playwright's Built-in Utilities:
- `page.setInputFiles()` for real file uploads
- `page.dragAndDrop()` for real drag operations  
- `page.waitForSelector()` for element waiting
- `expect(locator).toBeVisible()` for assertions
- `page.evaluate()` for DOM queries

### Create Real Test Assets:
- Use actual video/audio/image files as test fixtures
- Store test assets in `e2e/fixtures/` directory
- Use small file sizes for fast test execution
- Create files with known properties for assertions

### Measure Real Performance:
- Use `performance.now()` for timing measurements
- Access `performance.memory` for memory monitoring
- Use Playwright's tracing for performance analysis
- Set realistic performance budgets based on actual usage

The unit test utilities demonstrate good practices for isolated testing, but E2E tests should focus on real browser interactions and authentic user experiences.