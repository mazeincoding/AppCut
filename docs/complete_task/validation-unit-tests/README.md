# Validation Unit Tests - Archived ❌

These Jest unit tests for form validation were moved from the E2E test directory as they test validation logic directly rather than through user form interactions.

## Files Moved (January 2025):

### Validation Test Files:
- `form-validation.test.ts` - Filename validation unit tests with comprehensive test cases

## Why This Was Not Suitable for E2E (But Valuable):

### 1. **Direct Function Testing vs UI Validation**
```typescript
// Unit test approach (direct function call):
import { isValidFilename } from '@/lib/validation'

it('should reject filename with < character', () => {
  expect(isValidFilename('file<name')).toBe(false)
})
```

### 2. **Jest Framework Usage**
- Uses Jest to test validation function in isolation
- Tests the validation logic directly, not through form interactions
- No user interface or form behavior testing

### 3. **Missing UI Integration Testing**
- Tests validation logic but not how validation errors appear in UI
- No testing of form submission behavior with invalid inputs
- No verification of user feedback mechanisms

## ✅ Valuable Test Cases for E2E Conversion:

The test cases in this file are **highly valuable** and should be converted to E2E tests. They cover:

### Valid Filename Scenarios:
- Basic valid filenames (`my-video`, `Video_2024`)
- Filenames with spaces (`my video file`)
- Filenames with dots and dashes (`video.backup`, `my-project-v2`)
- Unicode characters (`видео`, `プロジェクト`)
- Common video project names (`vacation-2024`, `presentation-final`)

### Invalid Filename Scenarios:
- Invalid characters: `< > : " / \ | ? *`
- Empty filenames and whitespace-only
- Path traversal attempts (`../../../etc/passwd`)
- Command injection patterns (`file; rm -rf /`)
- HTML/XML injection (`<script>alert(1)</script>`)

### Edge Cases:
- Very long filenames (255+ characters)
- Single character filenames
- Filenames starting with dots (`.hidden`)
- Mixed case filenames
- Whitespace trimming behavior

## Better E2E Approach:

Convert these validation scenarios to test real form behavior:

### 1. **Test Filename Validation Through Export Dialog**
```typescript
// E2E approach
test('should validate filename in export dialog', async ({ page }) => {
  await page.goto('/editor/project/test')
  await page.click('nav button:has-text("Export")')
  
  // Test valid filenames
  const validNames = ['my-video', 'Video_2024', 'project-final', 'export123']
  for (const filename of validNames) {
    await page.fill('#filename', filename)
    await expect(page.locator('#filename')).not.toHaveClass(/error|invalid/)
    await expect(page.locator('.filename-error')).not.toBeVisible()
  }
  
  // Test filenames with spaces
  await page.fill('#filename', 'my video file')
  await expect(page.locator('#filename')).not.toHaveClass(/error|invalid/)
  
  // Test unicode characters
  await page.fill('#filename', 'プロジェクト')
  await expect(page.locator('#filename')).not.toHaveClass(/error|invalid/)
})
```

### 2. **Test Invalid Character Rejection Through UI**
```typescript
test('should show validation errors for invalid filenames', async ({ page }) => {
  await page.goto('/editor/project/test')
  await page.click('nav button:has-text("Export")')
  
  // Test each invalid character
  const invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
  for (const char of invalidChars) {
    const filename = `file${char}name`
    await page.fill('#filename', filename)
    
    // Verify visual error indication
    await expect(page.locator('#filename')).toHaveClass(/error|invalid|border-red/)
    await expect(page.locator('.filename-error')).toBeVisible()
    await expect(page.locator('.filename-error')).toContainText(/invalid|special characters|not allowed/i)
    
    // Verify export button is disabled
    await expect(page.locator('button:has-text("Export Video")')).toBeDisabled()
  }
})
```

### 3. **Test Empty Filename Prevention**
```typescript
test('should prevent export with empty filename', async ({ page }) => {
  await page.goto('/editor/project/test')
  await page.click('nav button:has-text("Export")')
  
  // Test empty filename
  await page.fill('#filename', '')
  await expect(page.locator('#filename')).toHaveClass(/error|invalid/)
  await expect(page.locator('.filename-error')).toContainText(/required|cannot be empty/i)
  await expect(page.locator('button:has-text("Export Video")')).toBeDisabled()
  
  // Test whitespace-only filename
  await page.fill('#filename', '   ')
  await expect(page.locator('#filename')).toHaveClass(/error|invalid/)
  await expect(page.locator('button:has-text("Export Video")')).toBeDisabled()
  
  // Test whitespace trimming works
  await page.fill('#filename', ' valid-filename ')
  await expect(page.locator('#filename')).not.toHaveClass(/error|invalid/)
  await expect(page.locator('button:has-text("Export Video")')).toBeEnabled()
})
```

### 4. **Test Security Validation Through UI**
```typescript
test('should reject security-risk filenames', async ({ page }) => {
  await page.goto('/editor/project/test')
  await page.click('nav button:has-text("Export")')
  
  // Test path traversal attempts
  const maliciousNames = [
    '../../../etc/passwd',
    '..\\..\\windows\\system32',
    'file; rm -rf /',
    'file | cat /etc/passwd',
    '<script>alert(1)</script>'
  ]
  
  for (const filename of maliciousNames) {
    await page.fill('#filename', filename)
    await expect(page.locator('#filename')).toHaveClass(/error|invalid/)
    await expect(page.locator('.filename-error')).toBeVisible()
    await expect(page.locator('button:has-text("Export Video")')).toBeDisabled()
  }
})
```

### 5. **Test Real-World Filename Scenarios**
```typescript
test('should accept common video project filenames', async ({ page }) => {
  await page.goto('/editor/project/test')
  await page.click('nav button:has-text("Export")')
  
  const commonNames = [
    'vacation-2024',
    'birthday_party', 
    'presentation-final',
    'client_review_draft',
    'project-export-1080p'
  ]
  
  for (const filename of commonNames) {
    await page.fill('#filename', filename)
    await expect(page.locator('#filename')).not.toHaveClass(/error|invalid/)
    await expect(page.locator('button:has-text("Export Video")')).toBeEnabled()
    
    // Test that export can be initiated with valid filename
    await page.click('button:has-text("Export Video")')
    await expect(page.locator('.export-progress, .export-error')).toBeVisible()
    await page.click('button:has-text("Cancel")') // Cancel to test next filename
  }
})
```

### 6. **Test Form Submission Behavior**
```typescript
test('should prevent form submission with invalid filename', async ({ page }) => {
  await page.goto('/editor/project/test')
  
  // Add some content to export
  await page.setInputFiles('#video-upload', 'test-assets/short-video.mp4')
  await page.dragAndDrop('.video-item', '.timeline')
  
  await page.click('nav button:has-text("Export")')
  
  // Try to submit with invalid filename
  await page.fill('#filename', 'invalid<filename')
  await page.click('button:has-text("Export Video")')
  
  // Verify export doesn't start
  await expect(page.locator('.export-progress')).not.toBeVisible()
  await expect(page.locator('.filename-error')).toBeVisible()
  
  // Fix filename and verify export can proceed
  await page.fill('#filename', 'valid-filename')
  await page.click('button:has-text("Export Video")')
  await expect(page.locator('.export-progress')).toBeVisible()
})
```

## Recommendation:

The validation unit test should be moved to complete_task, but **the test cases are extremely valuable** and should be converted to E2E tests that:

1. **Test Through Real Forms**: Use actual filename input fields in export dialog
2. **Verify Visual Feedback**: Check error styling, messages, and button states
3. **Test Form Behavior**: Verify form submission prevention with invalid inputs
4. **Cover All Scenarios**: Use the comprehensive test cases from the unit test
5. **Test Integration**: Verify validation works with the complete export workflow

The validation scenarios in this unit test represent excellent E2E test cases that should be implemented in `e2e/ui-tests/form-validation.spec.ts` to ensure the validation logic works correctly through real user interactions.