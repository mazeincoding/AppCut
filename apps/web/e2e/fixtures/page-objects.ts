/**
 * Page Object Models for E2E tests
 * Encapsulates page interactions and selectors for better test maintainability
 */

import { Page, Locator, expect } from '@playwright/test'

export class HomePage {
  readonly page: Page
  readonly getStartedButton: Locator
  readonly featuresSection: Locator
  readonly heroSection: Locator

  constructor(page: Page) {
    this.page = page
    this.getStartedButton = page.getByRole('button', { name: /get started/i })
    this.featuresSection = page.locator('[data-testid="features"]')
    this.heroSection = page.locator('[data-testid="hero"]')
  }

  async goto() {
    await this.page.goto('/')
  }

  async clickGetStarted() {
    await this.getStartedButton.click()
  }
}

export class AuthPage {
  readonly page: Page
  readonly loginTab: Locator
  readonly signupTab: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly nameInput: Locator
  readonly loginButton: Locator
  readonly signupButton: Locator
  readonly googleLoginButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.loginTab = page.getByRole('tab', { name: /login/i })
    this.signupTab = page.getByRole('tab', { name: /sign up/i })
    this.emailInput = page.getByPlaceholder(/email/i)
    this.passwordInput = page.getByPlaceholder(/password/i)
    this.nameInput = page.getByPlaceholder(/name/i)
    this.loginButton = page.getByRole('button', { name: /log in/i })
    this.signupButton = page.getByRole('button', { name: /sign up/i })
    this.googleLoginButton = page.getByRole('button', { name: /google/i })
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto() {
    await this.page.goto('/auth')
  }

  async login(email: string, password: string) {
    await this.loginTab.click()
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async signup(name: string, email: string, password: string) {
    await this.signupTab.click()
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.signupButton.click()
  }
}

export class EditorPage {
  readonly page: Page
  readonly canvas: Locator
  readonly timeline: Locator
  readonly mediaLibrary: Locator
  readonly uploadButton: Locator
  readonly playButton: Locator
  readonly pauseButton: Locator
  readonly exportButton: Locator
  readonly saveButton: Locator
  readonly newProjectButton: Locator
  readonly projectNameInput: Locator
  readonly timelineTrack: Locator
  readonly previewVideo: Locator
  readonly progressBar: Locator
  readonly currentTimeDisplay: Locator
  readonly durationDisplay: Locator

  constructor(page: Page) {
    this.page = page
    this.canvas = page.locator('[data-testid="editor-canvas"]')
    this.timeline = page.locator('[data-testid="timeline"]')
    this.mediaLibrary = page.locator('[data-testid="media-library"]')
    this.uploadButton = page.getByRole('button', { name: /upload/i })
    this.playButton = page.getByRole('button', { name: /play/i })
    this.pauseButton = page.getByRole('button', { name: /pause/i })
    this.exportButton = page.getByRole('button', { name: /export/i })
    this.saveButton = page.getByRole('button', { name: /save/i })
    this.newProjectButton = page.getByRole('button', { name: /new project/i })
    this.projectNameInput = page.getByPlaceholder(/project name/i)
    this.timelineTrack = page.locator('[data-testid="timeline-track"]')
    this.previewVideo = page.locator('[data-testid="preview-video"]')
    this.progressBar = page.locator('[data-testid="progress-bar"]')
    this.currentTimeDisplay = page.locator('[data-testid="current-time"]')
    this.durationDisplay = page.locator('[data-testid="duration"]')
  }

  async goto() {
    await this.page.goto('/editor')
  }

  async createNewProject(name: string) {
    await this.newProjectButton.click()
    await this.projectNameInput.fill(name)
    await this.page.getByRole('button', { name: /create/i }).click()
  }

  async uploadMedia(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
  }

  async dragElementToTimeline(elementSelector: string, timelinePosition: number = 0) {
    const element = this.page.locator(elementSelector)
    const timeline = this.timelineTrack.first()
    
    await element.dragTo(timeline, {
      targetPosition: { x: timelinePosition, y: 50 }
    })
  }

  async playVideo() {
    await this.playButton.click()
    await expect(this.pauseButton).toBeVisible()
  }

  async pauseVideo() {
    await this.pauseButton.click()
    await expect(this.playButton).toBeVisible()
  }

  async seekTo(timeInSeconds: number) {
    const progressBar = this.progressBar
    const bbox = await progressBar.boundingBox()
    
    if (bbox) {
      const x = (timeInSeconds / 30) * bbox.width // Assuming 30s duration
      await progressBar.click({ position: { x, y: bbox.height / 2 } })
    }
  }

  async saveProject() {
    await this.saveButton.click()
    await expect(this.page.locator('[data-testid="save-success"]')).toBeVisible()
  }
}

export class ExportDialog {
  readonly page: Page
  readonly dialog: Locator
  readonly formatSelect: Locator
  readonly qualitySelect: Locator
  readonly resolutionSelect: Locator
  readonly filenameInput: Locator
  readonly startExportButton: Locator
  readonly cancelButton: Locator
  readonly progressBar: Locator
  readonly statusMessage: Locator
  readonly downloadButton: Locator
  readonly errorMessage: Locator
  readonly previewSection: Locator
  readonly estimatedSize: Locator
  readonly estimatedTime: Locator

  constructor(page: Page) {
    this.page = page
    this.dialog = page.locator('[data-testid="export-dialog"]')
    this.formatSelect = page.locator('[data-testid="format-select"]')
    this.qualitySelect = page.locator('[data-testid="quality-select"]')
    this.resolutionSelect = page.locator('[data-testid="resolution-select"]')
    this.filenameInput = page.locator('[data-testid="filename-input"]')
    this.startExportButton = page.getByRole('button', { name: /start export/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
    this.progressBar = page.locator('[data-testid="export-progress"]')
    this.statusMessage = page.locator('[data-testid="export-status"]')
    this.downloadButton = page.getByRole('button', { name: /download/i })
    this.errorMessage = page.locator('[data-testid="export-error"]')
    this.previewSection = page.locator('[data-testid="export-preview"]')
    this.estimatedSize = page.locator('[data-testid="estimated-size"]')
    this.estimatedTime = page.locator('[data-testid="estimated-time"]')
  }

  async isVisible() {
    return await this.dialog.isVisible()
  }

  async selectFormat(format: 'MP4' | 'WEBM' | 'MOV') {
    await this.formatSelect.click()
    await this.page.getByRole('option', { name: format }).click()
  }

  async selectQuality(quality: 'HIGH' | 'MEDIUM' | 'LOW' | 'CUSTOM') {
    await this.qualitySelect.click()
    await this.page.getByRole('option', { name: quality }).click()
  }

  async selectResolution(resolution: '1080p' | '720p' | '480p' | '4K') {
    await this.resolutionSelect.click()
    await this.page.getByRole('option', { name: resolution }).click()
  }

  async setFilename(filename: string) {
    await this.filenameInput.clear()
    await this.filenameInput.fill(filename)
  }

  async startExport() {
    await this.startExportButton.click()
  }

  async cancelExport() {
    await this.cancelButton.click()
  }

  async waitForExportComplete(timeout: number = 30000) {
    await expect(this.downloadButton).toBeVisible({ timeout })
  }

  async downloadExport() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.downloadButton.click()
    return await downloadPromise
  }

  async getExportProgress(): Promise<number> {
    const progressText = await this.progressBar.getAttribute('aria-valuenow')
    return progressText ? parseInt(progressText) : 0
  }

  async getStatusMessage(): Promise<string> {
    return await this.statusMessage.textContent() || ''
  }

  async getEstimatedSize(): Promise<string> {
    return await this.estimatedSize.textContent() || ''
  }
}

export class MediaLibraryPanel {
  readonly page: Page
  readonly panel: Locator
  readonly uploadDropzone: Locator
  readonly mediaItems: Locator
  readonly searchInput: Locator
  readonly filterButtons: Locator
  readonly sortSelect: Locator
  readonly deleteButton: Locator
  readonly previewButton: Locator

  constructor(page: Page) {
    this.page = page
    this.panel = page.locator('[data-testid="media-library-panel"]')
    this.uploadDropzone = page.locator('[data-testid="upload-dropzone"]')
    this.mediaItems = page.locator('[data-testid="media-item"]')
    this.searchInput = page.locator('[data-testid="media-search"]')
    this.filterButtons = page.locator('[data-testid="media-filter"]')
    this.sortSelect = page.locator('[data-testid="media-sort"]')
    this.deleteButton = page.getByRole('button', { name: /delete/i })
    this.previewButton = page.getByRole('button', { name: /preview/i })
  }

  async uploadFile(filePath: string) {
    const fileInput = this.panel.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
  }

  async searchMedia(query: string) {
    await this.searchInput.fill(query)
  }

  async filterByType(type: 'video' | 'audio' | 'image' | 'all') {
    await this.filterButtons.filter({ hasText: type }).click()
  }

  async sortBy(criteria: 'name' | 'date' | 'size' | 'type') {
    await this.sortSelect.click()
    await this.page.getByRole('option', { name: criteria }).click()
  }

  async getMediaItemCount(): Promise<number> {
    return await this.mediaItems.count()
  }

  async selectMediaItem(index: number = 0) {
    await this.mediaItems.nth(index).click()
  }

  async previewMediaItem(index: number = 0) {
    await this.mediaItems.nth(index).hover()
    await this.previewButton.click()
  }

  async deleteMediaItem(index: number = 0) {
    await this.mediaItems.nth(index).hover()
    await this.deleteButton.click()
    await this.page.getByRole('button', { name: /confirm/i }).click()
  }
}