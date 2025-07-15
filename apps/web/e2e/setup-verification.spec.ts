/**
 * E2E Test Setup Verification
 * Basic test to verify E2E testing environment is properly configured
 */

import { test, expect } from '@playwright/test'
import { HomePage } from './fixtures/page-objects'
import { TestHelpers } from './helpers/test-helpers'

test.describe('E2E Setup Verification', () => {
  test.beforeEach(async ({ page }) => {
    const helpers = new TestHelpers(page)
    await helpers.mockBrowserAPIs()
  })

  test('should load the home page successfully', async ({ page }) => {
    const homePage = new HomePage(page)
    const helpers = new TestHelpers(page)
    
    await homePage.goto()
    await helpers.waitForAppLoad()
    
    // Verify page title
    await expect(page).toHaveTitle(/OpenCut/i)
    
    // Verify main navigation elements
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should have required browser APIs available', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    await page.goto('/')
    
    const support = await helpers.checkBrowserSupport()
    
    // Log browser support for debugging
    console.log('Browser support:', support)
    
    // These APIs are essential for OpenCut functionality
    expect(support.canvas).toBe(true)
    expect(support.fileAPI).toBe(true)
    expect(support.webWorkers).toBe(true)
    expect(support.indexedDB).toBe(true)
    
    // These may be mocked in test environment
    // expect(support.mediaRecorder).toBe(true)
    // expect(support.audioContext).toBe(true)
  })

  test('should handle basic navigation', async ({ page }) => {
    const homePage = new HomePage(page)
    const helpers = new TestHelpers(page)
    
    await homePage.goto()
    await helpers.waitForAppLoad()
    
    // Check if we can navigate to different sections
    const links = await page.getByRole('link').all()
    expect(links.length).toBeGreaterThan(0)
    
    // Try clicking a navigation link (if available)
    const editorLink = page.getByRole('link', { name: /editor/i }).first()
    if (await editorLink.isVisible()) {
      await editorLink.click()
      await helpers.waitForAppLoad()
      
      // Should navigate to editor page
      expect(page.url()).toContain('editor')
    }
  })

  test('should perform basic performance checks', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    const startTime = Date.now()
    await page.goto('/')
    await helpers.waitForAppLoad()
    const loadTime = Date.now() - startTime
    
    // Page should load within reasonable time
    expect(loadTime).toBeLessThan(10000) // 10 seconds max
    
    const metrics = await helpers.getPerformanceMetrics()
    console.log('Performance metrics:', metrics)
    
    // Basic performance assertions
    if (metrics.loadTime) {
      expect(metrics.loadTime).toBeLessThan(5000) // 5 seconds
    }
    
    if (metrics.memoryUsage) {
      // Memory usage should be reasonable
      expect(metrics.memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // 100MB
    }
  })

  test('should handle responsive design', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    await page.goto('/')
    await helpers.waitForAppLoad()
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('body')).toBeVisible()
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('body')).toBeVisible()
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
    
    // Verify responsive elements adapt
    const navigation = page.getByRole('navigation').first()
    if (await navigation.isVisible()) {
      const navBox = await navigation.boundingBox()
      expect(navBox?.width).toBeLessThanOrEqual(375)
    }
  })

  test('should handle error scenarios gracefully', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    // Test 404 page
    await page.goto('/non-existent-page')
    
    // Should show error page or redirect
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    
    // Navigate back to home
    await page.goto('/')
    await helpers.waitForAppLoad()
    
    // Should recover successfully
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should cleanup properly after test', async ({ page }) => {
    const helpers = new TestHelpers(page)
    
    await page.goto('/')
    await helpers.waitForAppLoad()
    
    // Add some data to storage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value')
      sessionStorage.setItem('test-session', 'test-data')
    })
    
    // Verify data was set
    const initialData = await page.evaluate(() => ({
      localStorage: localStorage.getItem('test-key'),
      sessionStorage: sessionStorage.getItem('test-session')
    }))
    
    expect(initialData.localStorage).toBe('test-value')
    expect(initialData.sessionStorage).toBe('test-data')
    
    // Cleanup
    await helpers.cleanup()
    
    // Verify data was cleared
    const clearedData = await page.evaluate(() => ({
      localStorage: localStorage.getItem('test-key'),
      sessionStorage: sessionStorage.getItem('test-session')
    }))
    
    expect(clearedData.localStorage).toBeNull()
    expect(clearedData.sessionStorage).toBeNull()
  })
})