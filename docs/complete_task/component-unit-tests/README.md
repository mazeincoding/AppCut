# Component Unit Tests - Archived ❌

These React component unit tests were moved from the E2E test directory as they are not suitable for E2E testing.

## Files Moved (January 2025):

### Component Test Files:
- `export-canvas.test.tsx` - Canvas component unit tests
- `export-dialog.test.tsx` - Export dialog component tests  
- `progress-display.test.tsx` - Progress display component tests

## Why These Were Not Useful:

### 1. **Wrong Testing Approach**
- These are **unit tests** using Jest and React Testing Library
- E2E tests should test **real components in real browsers**
- Heavy mocking defeats the purpose of E2E testing

### 2. **Extensive Mocking**
```tsx
// Example of heavy mocking approach:
jest.mock('@/stores/export-store')
jest.mock('@/lib/export-engine')
jest.mock('@/components/export-canvas')
jest.mock('@/components/ui/dialog')
```

### 3. **Not E2E Compatible**
- E2E tests interact with real DOM elements
- These tests mock everything including UI components
- No real user interaction testing

## Better E2E Approach:

Instead of unit testing components, E2E tests should:

1. **Test Real User Flows**
   ```typescript
   // E2E approach
   await page.click('button[aria-label="Export"]')
   await page.selectOption('#format', 'MP4')
   await page.click('button:has-text("Start Export")')
   await expect(page.locator('.progress-bar')).toBeVisible()
   ```

2. **Verify Real Component Behavior**
   - Click real buttons
   - Fill real forms
   - See real UI updates
   - Download real files

3. **No Mocking**
   - Use actual browser APIs
   - Test against real backend (or test doubles)
   - Verify actual file exports

## Original Purpose:

These tests were meant to verify:
- Component prop handling
- Event handler execution
- State management integration
- UI rendering logic

## Why Not Converted:

1. **Philosophy Mismatch**: Unit tests vs E2E tests serve different purposes
2. **Better Coverage**: UI behavior is already tested through E2E user flows
3. **Maintenance Burden**: Maintaining both unit and E2E tests for same components
4. **Limited Value**: Mocked component tests don't catch real integration issues

## Recommendation:

For component testing in OpenCut:
- Use E2E tests for user-facing behavior
- Focus on real user workflows
- Test components through actual usage patterns
- Avoid isolated component unit tests in E2E suite

These files serve as examples of what NOT to include in an E2E test suite.