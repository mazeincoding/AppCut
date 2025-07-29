/**
 * Filename Validation E2E Tests
 * Tests filename validation through the export dialog form
 * Focuses on input validation styling and form behavior
 */

import { test, expect } from '@playwright/test'

test.describe('Filename Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to editor and open export dialog
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    
    // Try to create or access a project
    const createProjectButton = page.getByRole('button', { name: /create.*project/i }).first()
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click()
      await page.waitForLoadState('networkidle')
    } else {
      // Navigate directly to editor
      await page.goto('/editor/project/test-project')
      await page.waitForLoadState('networkidle')
    }
    
    // Open export dialog
    await page.waitForSelector('nav button:has-text("Export")', { timeout: 10000 })
    await page.click('nav button:has-text("Export")')
    await page.waitForSelector('#filename', { timeout: 5000 })
  })

  test('should show validation for valid filenames', async ({ page }) => {
    console.log('🧪 Testing valid filename validation...')
    
    const validNames = ['my-video', 'Video_2024', 'project-final', 'export123']
    
    for (const filename of validNames) {
      await page.fill('#filename', filename)
      
      // Verify no error styling on filename input
      await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
      
      console.log(`✓ Valid filename "${filename}" - no error styling`)
    }
  })

  test('should show validation errors for invalid characters', async ({ page }) => {
    console.log('🧪 Testing invalid character validation...')
    
    const invalidChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    
    for (const char of invalidChars) {
      const filename = `file${char}name`
      await page.fill('#filename', filename)
      
      // Verify error styling appears
      await expect(page.locator('#filename')).toHaveClass(/border-red/)
      
      console.log(`✓ Invalid character "${char}" - error styling applied`)
    }
  })

  test('should handle empty filename validation', async ({ page }) => {
    console.log('🧪 Testing empty filename validation...')
    
    // Test empty filename
    await page.fill('#filename', '')
    
    // Export button should be disabled for empty filename (timelineDuration condition aside)
    const exportButton = page.locator('button:has-text("Export Video")')
    const isDisabled = await exportButton.getAttribute('disabled')
    expect(isDisabled).not.toBeNull()
    
    console.log('✓ Empty filename keeps export button disabled')
  })

  test('should validate filenames with spaces correctly', async ({ page }) => {
    console.log('🧪 Testing filenames with spaces...')
    
    const spacedNames = ['my video file', 'Project Final Cut', 'vacation 2024']
    
    for (const filename of spacedNames) {
      await page.fill('#filename', filename)
      
      // Filenames with spaces should be valid (no red border)
      await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
      
      console.log(`✓ Filename with spaces "${filename}" - valid`)
    }
  })

  test('should validate unicode characters correctly', async ({ page }) => {
    console.log('🧪 Testing unicode character validation...')
    
    const unicodeNames = ['видео', 'プロジェクト', 'proyecto']
    
    for (const filename of unicodeNames) {
      await page.fill('#filename', filename)
      
      // Unicode should be valid
      await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
      
      console.log(`✓ Unicode filename "${filename}" - valid`)
    }
  })

  test('should validate filename length limits', async ({ page }) => {
    console.log('🧪 Testing filename length validation...')
    
    // Test reasonable length filename
    const normalLength = 'a'.repeat(50)
    await page.fill('#filename', normalLength)
    await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
    
    // Test very long filename
    const longLength = 'a'.repeat(200)
    await page.fill('#filename', longLength)
    // Should still be valid (no specific length limit in our validation)
    await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
    
    console.log('✓ Length validation working')
  })

  test('should handle special valid characters', async ({ page }) => {
    console.log('🧪 Testing special valid characters...')
    
    const specialValidNames = [
      'file-with-dashes',
      'file_with_underscores', 
      'file.with.dots',
      'File With Spaces',
      '.hidden-file',
      'MixedCaseFile'
    ]
    
    for (const filename of specialValidNames) {
      await page.fill('#filename', filename)
      await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
      console.log(`✓ Special valid filename "${filename}" - valid`)
    }
  })

  test('should validate whitespace trimming behavior', async ({ page }) => {
    console.log('🧪 Testing whitespace trimming...')
    
    // Test filename with leading/trailing spaces
    await page.fill('#filename', '  valid-filename  ')
    
    // Should be valid (trimming removes spaces)
    await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
    
    // Test only whitespace
    await page.fill('#filename', '   ')
    
    // Should be invalid (empty after trim)
    const exportButton = page.locator('button:has-text("Export Video")')
    const isDisabled = await exportButton.getAttribute('disabled')
    expect(isDisabled).not.toBeNull()
    
    console.log('✓ Whitespace trimming working correctly')
  })

  test('should provide immediate validation feedback', async ({ page }) => {
    console.log('🧪 Testing immediate validation feedback...')
    
    // Start with valid filename
    await page.fill('#filename', 'valid-name')
    await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
    
    // Add invalid character
    await page.fill('#filename', 'valid-name<')
    await expect(page.locator('#filename')).toHaveClass(/border-red/)
    
    // Remove invalid character
    await page.fill('#filename', 'valid-name')
    await expect(page.locator('#filename')).not.toHaveClass(/border-red/)
    
    console.log('✓ Immediate validation feedback working')
  })

  test('should persist filename between dialog sessions', async ({ page }) => {
    console.log('🧪 Testing filename persistence...')
    
    // Set a filename
    await page.fill('#filename', 'persistent-test')
    
    // Close dialog
    await page.click('button:has-text("Cancel")')
    
    // Reopen dialog
    await page.click('nav button:has-text("Export")')
    await page.waitForSelector('#filename')
    
    // Verify filename persisted
    await expect(page.locator('#filename')).toHaveValue('persistent-test')
    
    console.log('✓ Filename persistence working')
  })
})