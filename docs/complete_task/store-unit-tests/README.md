# Store Unit Tests - Archived ❌

These Jest unit tests for Zustand stores were moved from the E2E test directory as they test internal state management logic rather than user-facing behavior.

## Files Moved (January 2025):

### Store Test Files:
- `export-store.test.ts` - Export store unit tests using React Testing Library's renderHook

## Why This Was Not Suitable for E2E:

### 1. **Internal State Testing vs User Behavior**
```typescript
// Unit test approach (internal):
import { renderHook, act } from '@testing-library/react'
import { useExportStore } from '@/stores/export-store'

const { result } = renderHook(() => useExportStore())
act(() => {
  result.current.updateSettings({ format: ExportFormat.WEBM })
})
expect(result.current.settings.format).toBe(ExportFormat.WEBM)
```

### 2. **Jest + React Testing Library Framework**
- Uses `renderHook` to test Zustand hooks in isolation
- Tests store actions and state updates directly
- No browser interaction or real user workflows
- Isolated component testing, not integration testing

### 3. **No User Interface Integration**
- Tests store methods directly without UI components
- No verification of how UI reflects store changes
- No testing of user interactions that trigger store updates
- Missing the connection between user actions and state changes

## Better E2E Approach:

Instead of testing store internals, E2E tests should verify store behavior through actual UI:

### 1. **Test Export Settings Through UI**
```typescript
// E2E approach
test('should update export settings through UI', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Open export dialog
  await page.click('nav button:has-text("Export")')
  
  // Change format through UI
  await page.check('input[value="webm"]')
  
  // Change quality through UI  
  await page.check('input[value="720p"]')
  
  // Change filename through UI
  await page.fill('#filename', 'custom-export')
  
  // Verify settings are reflected in UI
  await expect(page.locator('input[value="webm"]')).toBeChecked()
  await expect(page.locator('input[value="720p"]')).toBeChecked()
  await expect(page.locator('#filename')).toHaveValue('custom-export')
  
  // Test that settings persist when closing/reopening dialog
  await page.click('button:has-text("Cancel")')
  await page.click('nav button:has-text("Export")')
  await expect(page.locator('#filename')).toHaveValue('custom-export')
})
```

### 2. **Test Export Progress Through UI**
```typescript
// E2E approach
test('should show export progress in UI', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Add test media to timeline
  await page.setInputFiles('#video-upload', 'test-video.mp4')
  await page.dragAndDrop('.video-item', '.timeline')
  
  // Start export
  await page.click('nav button:has-text("Export")')
  await page.click('button:has-text("Export Video")')
  
  // Verify progress UI appears
  await expect(page.locator('.export-progress')).toBeVisible()
  await expect(page.locator('.progress-bar')).toBeVisible()
  
  // Verify progress updates
  await page.waitForFunction(() => {
    const progressText = document.querySelector('.progress-text')?.textContent
    return progressText && !progressText.includes('0%')
  })
  
  // Verify status messages appear
  await expect(page.locator('.export-status')).toContainText(/processing|rendering|finalizing/i)
  
  // Wait for completion
  await page.waitForSelector('.export-complete', { timeout: 30000 })
  await expect(page.locator('.export-status')).toContainText('Export complete')
})
```

### 3. **Test Error Handling Through UI**
```typescript
// E2E approach  
test('should display export errors in UI', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Try to export without media (should cause error)
  await page.click('nav button:has-text("Export")')
  await page.click('button:has-text("Export Video")')
  
  // Verify error is displayed in UI
  await expect(page.locator('.export-error')).toBeVisible()
  await expect(page.locator('.export-error')).toContainText(/no content|empty timeline/i)
  
  // Verify export button is re-enabled after error
  await expect(page.locator('button:has-text("Export Video")')).toBeEnabled()
  
  // Verify error can be dismissed
  await page.click('.error-dismiss')
  await expect(page.locator('.export-error')).not.toBeVisible()
})
```

### 4. **Test Settings Persistence**
```typescript
// E2E approach
test('should persist export settings across sessions', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Set custom export settings
  await page.click('nav button:has-text("Export")')
  await page.check('input[value="webm"]')
  await page.fill('#filename', 'persistent-export')
  await page.click('button:has-text("Cancel")')
  
  // Reload page
  await page.reload()
  await page.waitForLoadState('networkidle')
  
  // Verify settings persisted
  await page.click('nav button:has-text("Export")')
  await expect(page.locator('input[value="webm"]')).toBeChecked()
  await expect(page.locator('#filename')).toHaveValue('persistent-export')
})
```

## Original Purpose:

The export store unit test verified:
- **Default Settings**: Format, quality, dimensions, filename generation
- **Settings Updates**: Format changes, quality changes, filename updates
- **Progress Tracking**: Export progress, frame counts, time estimation  
- **Error Handling**: Error message setting and clearing
- **State Reset**: Returning to default state after export

## Why Not Converted:

1. **Different Testing Levels**: Unit tests verify store logic, E2E tests verify user experience
2. **Internal vs External**: Store internals should be tested through UI interactions
3. **Integration Focus**: E2E tests verify the full user workflow, not isolated store behavior
4. **User-Centric**: E2E tests focus on what users can observe and interact with

## Recommendation:

For testing export store functionality in OpenCut:

### Test Store Behavior Through UI:
- Change export settings through form controls
- Monitor progress through progress bars and status text
- Verify error messages appear in UI alerts/notifications
- Test settings persistence through page reloads
- Verify export completion through download interactions

### Focus on User-Observable Behavior:
- Can users change export settings and see them reflected?
- Do progress indicators update during export?
- Are error messages clearly displayed to users?
- Do settings persist as expected between sessions?
- Does the complete export workflow function correctly?

The store unit test demonstrates good practices for isolated state testing, but E2E tests should verify that the store correctly integrates with the UI to provide the intended user experience.