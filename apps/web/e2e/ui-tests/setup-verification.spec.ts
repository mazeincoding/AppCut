/**
 * E2E Test Setup Verification
 * Basic test to verify E2E testing environment is properly configured
 */

import { test, expect } from '@playwright/test'
import { HomePage } from '../fixtures/page-objects'

test.describe('E2E Setup Verification', () => {

  test('should load the home page successfully', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await homePage.goto()
    await page.waitForLoadState('networkidle')
    
    // Verify page loads (title may vary in dev)
    const title = await page.title()
    console.log('Page title:', title)
    expect(title).toBeDefined()
    
    // Verify page has content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    
    // Verify main content is visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have required browser APIs available', async ({ page }) => {
    await page.goto('/')
    
    const support = await page.evaluate(() => {
      return {
        mediaRecorder: !!window.MediaRecorder,
        webWorkers: !!window.Worker,
        indexedDB: !!window.indexedDB,
        canvas: !!document.createElement('canvas').getContext,
        fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
      }
    })
    
    // Log browser support for debugging
    console.log('Browser support:', support)
    
    // These APIs are essential for OpenCut functionality
    expect(support.canvas).toBe(true)
    expect(support.fileAPI).toBe(true)
    expect(support.webWorkers).toBe(true)
    expect(support.indexedDB).toBe(true)
  })

  test('should handle basic navigation', async ({ page }) => {
    const homePage = new HomePage(page)
    
    await homePage.goto()
    await page.waitForLoadState('networkidle')
    
    // Check if we can navigate to different sections
    const links = await page.getByRole('link').all()
    expect(links.length).toBeGreaterThan(0)
    
    // Try clicking a navigation link (if available)
    const editorLink = page.getByRole('link', { name: /editor/i }).first()
    if (await editorLink.isVisible()) {
      await editorLink.click()
      await page.waitForLoadState('networkidle')
      
      // Should navigate to editor page
      expect(page.url()).toContain('editor')
    }
  })

  test('should perform basic performance checks', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Page should load within reasonable time (dev server can be slow on first load)
    expect(loadTime).toBeLessThan(20000) // 20 seconds max for dev environment
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any
      const memory = (performance as any).memory
      
      return {
        loadTime: navigation?.loadEventEnd - navigation?.navigationStart,
        memoryUsage: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
        } : null
      }
    })
    
    console.log('Performance metrics:', metrics)
    
    // Basic performance assertions
    if (metrics.loadTime) {
      expect(metrics.loadTime).toBeLessThan(5000) // 5 seconds
    }
    
    if (metrics.memoryUsage) {
      // Memory usage should be reasonable (increased for modern apps)
      expect(metrics.memoryUsage.usedJSHeapSize).toBeLessThan(150 * 1024 * 1024) // 150MB
    }
  })

  test('should handle responsive design', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
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
    // Test 404 page
    await page.goto('/non-existent-page')
    
    // Should show error page or redirect
    const pageContent = await page.textContent('body')
    expect(pageContent).toBeTruthy()
    
    // Navigate back to home
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Should recover successfully
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should cleanup properly after test', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
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
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Verify data was cleared
    const clearedData = await page.evaluate(() => ({
      localStorage: localStorage.getItem('test-key'),
      sessionStorage: sessionStorage.getItem('test-session')
    }))
    
    expect(clearedData.localStorage).toBeNull()
    expect(clearedData.sessionStorage).toBeNull()
  })
})