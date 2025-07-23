# Export All Media Feature Implementation Plan (Revised)

## ⚠️ Critical Design Change
**Original Plan**: Individual downloads via `link.click()` - **REJECTED due to navigation bugs and browser limitations**

**Revised Approach**: Create a downloadable ZIP archive or provide copy-to-clipboard URLs

## Overview
Add an "Export All" button to the media panel that allows users to export all media items safely without triggering browser download issues that can cause navigation bugs.

## 📁 Quick File Reference

**🆕 5 New Files (Revised):**
- `apps/web/src/components/editor/media-panel/export-all-button.tsx`
- `apps/web/src/components/editor/media-panel/zip-creation-modal.tsx`
- `apps/web/src/lib/zip-manager.ts`
- `apps/web/src/lib/file-naming.ts`
- `apps/web/src/hooks/use-zip-export.ts`

**🔄 4 Files to Modify:**
- `apps/web/src/components/editor/media-panel/views/media.tsx`
- `apps/web/src/lib/image-utils.ts`
- `apps/web/src/stores/media-store.ts`
- `apps/web/src/components/editor/media-panel/index.tsx`

*📖 [Complete file details with phases](#-files-to-createmodify-reference)*

## 🚨 Why Not Individual Downloads?

### Issues with Original Approach:
1. **Navigation Bug Risk**: `link.click()` can cause browser navigation to blob URLs (we just fixed this!)
2. **Browser Popup Blockers**: Multiple downloads trigger security blocks
3. **User Gesture Limits**: Only first download gets user gesture, rest may fail
4. **Performance Issues**: Simultaneous downloads can overwhelm browser
5. **Memory Problems**: Multiple blob URLs can cause memory leaks

### Evidence from Codebase:
```typescript
// From adjustment.tsx - Download disabled due to navigation bug
// Download functionality temporarily disabled to fix navigation bug
// TODO: Re-implement download without causing navigation to blob URL

// Current media store structure (apps/web/src/stores/media-store.ts)
interface MediaItem {
  id: string
  name: string
  type: 'image' | 'video' | 'audio'
  url: string
  file: File
  size: number
  duration?: number
  dimensions?: { width: number; height: number }
  thumbnail?: string
  createdAt: number
}

// Existing download utility (apps/web/src/lib/image-utils.ts)
export async function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click() // This causes navigation bug!
  URL.revokeObjectURL(url)
}
```

## 🎯 Revised User Story
**As a user, I want to export all media items from my project safely so that I can get local copies without browser issues or navigation bugs.**

## 💡 Safe Alternative Approaches

### Option 1: ZIP Archive (Recommended)
- Create ZIP file containing all media
- Single download, no navigation risk
- Preserves folder structure and names

### Option 2: File URL Export
- Generate shareable URLs for each file
- Copy to clipboard or display in modal
- User can save individual files manually

### Option 3: Browser File System API (Future)
- Use modern File System Access API
- Direct folder selection by user
- No blob URL navigation issues

## 📦 Dependencies Required

### ZIP Library Options:
1. **JSZip** (Recommended)
   ```bash
   npm install jszip @types/jszip
   ```
   - Mature, well-tested library
   - Good performance with large files
   - TypeScript support

2. **fflate** (Lightweight alternative)
   ```bash
   npm install fflate
   ```
   - Smaller bundle size
   - Faster compression
   - Modern ES modules

### Package.json Updates Needed:
```json
{
  "dependencies": {
    "jszip": "^3.10.1"
  },
  "devDependencies": {
    "@types/jszip": "^3.4.1"
  }
}
```

## 📋 Requirements

### Functional Requirements (Revised)
1. **Export All Button**: Add prominent button in media panel header
2. **ZIP Archive Creation**: Bundle all media items into a single ZIP file
3. **File Organization**: Maintain original filenames with conflict resolution
4. **Progress Indication**: Show ZIP creation progress
5. **Error Handling**: Handle failed archive creation gracefully
6. **File Types**: Support images, videos, and audio files
7. **Cancel Option**: Allow users to cancel ZIP creation
8. **Single Download**: One safe download of the complete ZIP archive

### Non-Functional Requirements
- **Performance**: Handle large numbers of files efficiently
- **User Experience**: Clear feedback during download process
- **Browser Compatibility**: Work across different browsers
- **Memory Efficiency**: Avoid loading all files into memory at once

## 🏗️ Technical Design

### UI Components

#### 1. Download All Button Location
```
Media Panel Header:
[🎬 Media] [📊 Usage: 45.2MB] [⬇️ Download All] [🔍 Search]
```

#### 2. Download Progress Modal
```
┌─────────────────────────────────┐
│  Downloading Media Files        │
├─────────────────────────────────┤
│  ✅ image1.jpg (completed)      │
│  ⏳ video1.mp4 (downloading...) │
│  ⏸️ audio1.mp3 (pending)        │
│                                 │
│  Progress: 2/15 files           │
│  [████████░░░░░░░░] 53%         │
│                                 │
│  [Cancel] [Minimize]            │
└─────────────────────────────────┘
```

### Implementation Architecture

#### 1. Core Components
- **DownloadAllButton**: Main button component
- **BatchDownloadModal**: Progress tracking modal
- **DownloadManager**: Core download logic service
- **FileNamingService**: Handle file naming conflicts

#### 2. File Structure

**🆕 New Files to Create:**
```
apps/web/src/components/editor/media-panel/download-all-button.tsx
apps/web/src/components/editor/media-panel/batch-download-modal.tsx
apps/web/src/lib/download-manager.ts
apps/web/src/lib/file-naming.ts
apps/web/src/hooks/use-batch-download.ts
```

**🔄 Existing Files to Modify:**
```
apps/web/src/components/editor/media-panel/views/media.tsx
apps/web/src/lib/image-utils.ts (enhance existing download utilities)
apps/web/src/stores/media-store.ts (add download state if needed)
apps/web/src/components/editor/media-panel/index.tsx (if header changes needed)
```

**📁 Complete File Structure:**
```
apps/web/src/
├── components/editor/media-panel/
│   ├── download-all-button.tsx      # 🆕 Main button component
│   ├── batch-download-modal.tsx     # 🆕 Progress modal
│   ├── index.tsx                    # 🔄 May need header updates
│   └── views/media.tsx              # 🔄 Updated to include button
├── lib/
│   ├── download-manager.ts          # 🆕 Batch download logic
│   ├── file-naming.ts              # 🆕 Name conflict resolution
│   └── image-utils.ts              # 🔄 Enhanced download utilities
├── stores/
│   └── media-store.ts              # 🔄 Add download state if needed
└── hooks/
    └── use-batch-download.ts       # 🆕 Download state management
```

#### 3. Data Flow
```
User Click → DownloadAllButton → DownloadManager → Individual Downloads → Progress Updates → UI Feedback
```

## 🔧 Implementation Details

### Phase 1: Core Infrastructure

#### 1. ZIP Manager Implementation (`lib/zip-manager.ts`)
```typescript
import JSZip from 'jszip'
import { MediaItem } from '@/stores/media-store'

export interface ZipExportOptions {
  filename?: string
  compression?: 'DEFLATE' | 'STORE'
  compressionLevel?: number
  includeMetadata?: boolean
}

export class ZipManager {
  private zip: JSZip
  private readonly defaultOptions: ZipExportOptions = {
    filename: 'media-export.zip',
    compression: 'DEFLATE',
    compressionLevel: 6,
    includeMetadata: true
  }

  constructor() {
    this.zip = new JSZip()
  }

  async addMediaItems(items: MediaItem[], onProgress?: (progress: number) => void): Promise<void> {
    const total = items.length
    let completed = 0

    for (const item of items) {
      try {
        const response = await fetch(item.url)
        const blob = await response.blob()
        
        // Resolve naming conflicts
        const filename = this.resolveFilename(item.name)
        
        // Add file to ZIP
        this.zip.file(filename, blob)
        
        completed++
        onProgress?.(completed / total)
      } catch (error) {
        console.error(`Failed to add ${item.name} to ZIP:`, error)
        // Continue with other files
      }
    }
  }

  async generateZip(options: Partial<ZipExportOptions> = {}): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options }
    
    return await this.zip.generateAsync({
      type: 'blob',
      compression: opts.compression,
      compressionOptions: {
        level: opts.compressionLevel
      }
    })
  }

  private resolveFilename(originalName: string): string {
    const files = Object.keys(this.zip.files)
    let filename = originalName
    let counter = 1

    while (files.includes(filename)) {
      const ext = originalName.split('.').pop()
      const base = originalName.replace(`.${ext}`, '')
      filename = `${base} (${counter}).${ext}`
      counter++
    }

    return filename
  }

  reset(): void {
    this.zip = new JSZip()
  }
}

// Safe download utility to replace the problematic one
export async function downloadZipSafely(blob: Blob, filename: string): Promise<void> {
  // Use modern File System Access API if available
  if ('showSaveFilePicker' in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'ZIP files',
          accept: { 'application/zip': ['.zip'] }
        }]
      })
      
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // Fall back to traditional download if user cancels or API unavailable
    }
  }

  // Traditional download with navigation bug prevention
  const url = URL.createObjectURL(blob)
  
  // Create download in a way that prevents navigation
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (iframeDoc) {
    const link = iframeDoc.createElement('a')
    link.href = url
    link.download = filename
    iframeDoc.body.appendChild(link)
    link.click()
    iframeDoc.body.removeChild(link)
  }
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(iframe)
    URL.revokeObjectURL(url)
  }, 100)
}
```

#### 2. Download Manager (`lib/download-manager.ts`)
```typescript
export class DownloadManager {
  private queue: DownloadItem[] = [];
  private activeDownloads = new Set<string>();
  private maxConcurrent = 3;
  
  async downloadAll(items: MediaItem[], options: BatchDownloadOptions): Promise<void>
  private async downloadItem(item: DownloadItem): Promise<void>
  private async createDownloadLink(blob: Blob, filename: string): Promise<void>
  private resolveNameConflict(filename: string): string
  private updateProgress(itemId: string, progress: number): void
}
```

### Phase 2: UI Components

#### 1. Export All Button Component (`components/editor/media-panel/export-all-button.tsx`)
```typescript
'use client'

import { useState } from 'react'
import { Download, Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaStore } from '@/stores/media-store'
import { ZipManager, downloadZipSafely } from '@/lib/zip-manager'
import { cn } from '@/lib/utils'

interface ExportAllButtonProps {
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
}

export function ExportAllButton({ 
  className, 
  variant = 'outline', 
  size = 'sm' 
}: ExportAllButtonProps) {
  const { mediaItems } = useMediaStore()
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleExportAll = async () => {
    if (mediaItems.length === 0 || isExporting) return

    setIsExporting(true)
    setProgress(0)

    try {
      const zipManager = new ZipManager()
      
      // Add all media items to ZIP with progress tracking
      await zipManager.addMediaItems(mediaItems, (progress) => {
        setProgress(Math.round(progress * 50)) // First 50% for adding files
      })

      // Generate ZIP file
      setProgress(75)
      const zipBlob = await zipManager.generateZip({
        filename: `media-export-${Date.now()}.zip`
      })

      // Download safely
      setProgress(90)
      await downloadZipSafely(zipBlob, `media-export-${Date.now()}.zip`)

      setProgress(100)
      
      // Show success feedback briefly
      setTimeout(() => {
        setProgress(0)
        setIsExporting(false)
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setProgress(0)
      // TODO: Show error toast
    }
  }

  const isEmpty = mediaItems.length === 0
  const buttonText = isExporting 
    ? `Exporting... ${progress}%`
    : `Export All (${mediaItems.length})`

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExportAll}
      disabled={isEmpty || isExporting}
      data-testid="export-all-button"
      className={cn(
        'gap-2 transition-all duration-200',
        isExporting && 'cursor-not-allowed',
        className
      )}
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {progress > 0 && (
            <div 
              className="text-xs bg-muted rounded px-1"
              data-testid="export-progress"
            >
              {progress}%
            </div>
          )}
        </>
      ) : (
        <>
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">{buttonText}</span>
          <span className="sm:hidden">Export</span>
        </>
      )}
    </Button>
  )
}
```

#### 2. Batch Download Modal (`components/editor/media-panel/batch-download-modal.tsx`)
```typescript
interface BatchDownloadModalProps {
  isOpen: boolean;
  downloadItems: DownloadItem[];
  onClose: () => void;
  onCancel: () => void;
}

export function BatchDownloadModal({ isOpen, downloadItems, ... }: BatchDownloadModalProps) {
  // Progress display, cancel handling, minimize functionality
}
```

### Phase 3: Integration

#### 1. Media Panel Integration (`components/editor/media-panel/views/media.tsx`)
```typescript
// Add to existing media panel header
import { ExportAllButton } from '../export-all-button'

export function MediaView() {
  const { mediaItems } = useMediaStore()
  
  return (
    <div className="flex flex-col h-full">
      {/* Header with Export All button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Media</h3>
          <Badge variant="secondary">{mediaItems.length}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <ExportAllButton />
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Existing media grid */}
      <div className="flex-1 p-4">
        {mediaItems.length > 0 ? (
          <MediaGrid items={mediaItems} />
        ) : (
          <EmptyMediaState />
        )}
      </div>
    </div>
  )
}
```

#### 2. Custom Hook for Export State (`hooks/use-zip-export.ts`)
```typescript
import { useState, useCallback } from 'react'
import { ZipManager, downloadZipSafely, ZipExportOptions } from '@/lib/zip-manager'
import { MediaItem } from '@/stores/media-store'

export interface ExportProgress {
  phase: 'idle' | 'adding' | 'compressing' | 'downloading' | 'complete' | 'error'
  progress: number
  currentFile?: string
  totalFiles: number
  completedFiles: number
  error?: string
}

export function useZipExport() {
  const [exportState, setExportState] = useState<ExportProgress>({
    phase: 'idle',
    progress: 0,
    totalFiles: 0,
    completedFiles: 0
  })

  const exportToZip = useCallback(async (
    items: MediaItem[], 
    options?: Partial<ZipExportOptions>
  ) => {
    if (items.length === 0) return

    setExportState({
      phase: 'adding',
      progress: 0,
      totalFiles: items.length,
      completedFiles: 0
    })

    try {
      const zipManager = new ZipManager()
      
      // Phase 1: Add files to ZIP
      await zipManager.addMediaItems(items, (progress) => {
        setExportState(prev => ({
          ...prev,
          phase: 'adding',
          progress: Math.round(progress * 40), // 40% for adding files
          completedFiles: Math.round(progress * items.length)
        }))
      })

      // Phase 2: Compress ZIP
      setExportState(prev => ({
        ...prev,
        phase: 'compressing',
        progress: 60
      }))

      const zipBlob = await zipManager.generateZip(options)

      // Phase 3: Download
      setExportState(prev => ({
        ...prev,
        phase: 'downloading',
        progress: 90
      }))

      const filename = options?.filename || `media-export-${Date.now()}.zip`
      await downloadZipSafely(zipBlob, filename)

      // Complete
      setExportState(prev => ({
        ...prev,
        phase: 'complete',
        progress: 100
      }))

      // Reset after delay
      setTimeout(() => {
        setExportState({
          phase: 'idle',
          progress: 0,
          totalFiles: 0,
          completedFiles: 0
        })
      }, 2000)

    } catch (error) {
      setExportState(prev => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Export failed'
      }))
    }
  }, [])

  const resetExport = useCallback(() => {
    setExportState({
      phase: 'idle',
      progress: 0,
      totalFiles: 0,
      completedFiles: 0
    })
  }, [])

  return {
    exportState,
    exportToZip,
    resetExport,
    isExporting: exportState.phase !== 'idle' && exportState.phase !== 'complete' && exportState.phase !== 'error'
  }
}
```

## 🎨 User Experience Flow

### 1. Normal Flow
1. User clicks "Download All" button
2. System validates media items exist
3. Modal opens showing download queue
4. Downloads start automatically (3 concurrent max)
5. Progress updates in real-time
6. Completed files appear in browser downloads
7. Success notification when all complete

### 2. Error Handling
- **No Media**: Button disabled with tooltip "No media to download"
- **Network Error**: Retry failed downloads automatically (3 attempts)
- **Storage Full**: Clear error message with suggestion
- **Browser Block**: Instructions to allow downloads

### 3. Edge Cases
- **Large Files**: Show file size warnings
- **Duplicate Names**: Auto-rename with suffix (1), (2), etc.
- **Cancelled Downloads**: Clean up partial downloads
- **Browser Refresh**: Warn about losing progress

## 📁 File Naming Strategy

### Default Naming Convention
```
Original: project-files/
├── IMG_001.jpg → IMG_001.jpg
├── video.mp4 → video.mp4
├── audio.mp3 → audio.mp3
└── IMG_001.jpg → IMG_001 (1).jpg  # Conflict resolution
```

### Enhanced Naming (Optional)
```
With Project Context:
├── MyProject_IMG_001.jpg
├── MyProject_video_001.mp4
├── MyProject_audio_001.mp3
```

## 🧪 Testing Strategy

### 1. Unit Tests
- ZIP manager file compression and naming
- File naming conflict resolution with Unicode characters
- Error handling scenarios (network failures, CORS issues)
- Progress calculation accuracy
- Safe download utility functions

### 2. Integration Tests
- Full ZIP export flow end-to-end
- UI state updates during export process
- Progress modal interactions
- Cancel functionality during compression
- Error recovery and cleanup

### 3. Playwright E2E Tests (Windows/Chinese Environment Considerations)

#### Basic Export Test (`apps/web/e2e/export-all-media.spec.ts`)
```typescript
import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// Windows path handling for downloads
const getDownloadsPath = () => {
  if (process.platform === 'win32') {
    return path.join(process.env.USERPROFILE || '', 'Downloads')
  }
  return path.join(process.env.HOME || '', 'Downloads')
}

test.describe('Export All Media', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor/project')
    
    // Clear any existing downloads
    const downloadsPath = getDownloadsPath()
    const existingZips = fs.readdirSync(downloadsPath)
      .filter(file => file.startsWith('media-export-') && file.endsWith('.zip'))
    
    existingZips.forEach(file => {
      try {
        fs.unlinkSync(path.join(downloadsPath, file))
      } catch (error) {
        console.warn(`Could not delete ${file}:`, error)
      }
    })
  })

  test('exports all media files to ZIP successfully', async ({ page }) => {
    // Upload test media files with various names (including Chinese characters)
    const testFiles = [
      'test-image.jpg',
      'test-video.mp4', 
      '测试图片.png',  // Chinese filename
      'файл.jpg',      // Cyrillic filename
      'file with spaces.png'
    ]

    // Upload files to media panel
    for (const filename of testFiles) {
      const filePath = path.join(__dirname, 'fixtures', filename)
      await page.locator('[data-testid="media-upload-input"]').setInputFiles(filePath)
      await expect(page.locator(`[data-testid="media-item-${filename}"]`)).toBeVisible()
    }

    // Set up download event listener
    const downloadPromise = page.waitForEvent('download')

    // Click export all button
    await page.locator('[data-testid="export-all-button"]').click()

    // Wait for export progress to complete
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-progress"]')).toContainText('100%')

    // Verify download started
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/media-export-\d+\.zip/)

    // Save download and verify contents
    const downloadsPath = getDownloadsPath()
    const downloadPath = path.join(downloadsPath, download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Verify ZIP file exists and has expected size
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const stats = fs.statSync(downloadPath)
    expect(stats.size).toBeGreaterThan(1000) // Should have substantial content

    // Optional: Extract and verify ZIP contents using node-stream-zip
    // const StreamZip = require('node-stream-zip')
    // const zip = new StreamZip.async({ file: downloadPath })
    // const entries = await zip.entries()
    // expect(Object.keys(entries)).toHaveLength(testFiles.length)
    // await zip.close()

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('handles Chinese/Unicode filenames correctly', async ({ page }) => {
    const unicodeFiles = [
      '中文文件名.jpg',
      'файл с русским именем.png',
      'عربي.mp4',
      'ファイル名.gif'
    ]

    // Upload Unicode files
    for (const filename of unicodeFiles) {
      const filePath = path.join(__dirname, 'fixtures', filename)
      await page.locator('[data-testid="media-upload-input"]').setInputFiles(filePath)
    }

    // Export and verify no encoding issues
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="export-all-button"]').click()
    
    await expect(page.locator('[data-testid="export-progress"]')).toContainText('100%')
    
    const download = await downloadPromise
    const downloadPath = path.join(getDownloadsPath(), download.suggestedFilename())
    await download.saveAs(downloadPath)
    
    // Verify file was created successfully (no encoding errors)
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    
    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('handles export cancellation gracefully', async ({ page }) => {
    // Upload large files to make cancellation testable
    const largeFiles = ['large-video.mp4', 'large-image.jpg']
    
    for (const filename of largeFiles) {
      const filePath = path.join(__dirname, 'fixtures', filename)
      await page.locator('[data-testid="media-upload-input"]').setInputFiles(filePath)
    }

    // Start export
    await page.locator('[data-testid="export-all-button"]').click()
    
    // Wait for progress to start
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible()
    
    // Cancel export while in progress
    await page.locator('[data-testid="cancel-export-button"]').click()
    
    // Verify export was cancelled
    await expect(page.locator('[data-testid="export-progress"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="export-all-button"]')).toBeEnabled()
  })

  test('shows appropriate error for empty media library', async ({ page }) => {
    // Ensure no media items
    await expect(page.locator('[data-testid="media-item"]')).toHaveCount(0)
    
    // Export button should be disabled
    await expect(page.locator('[data-testid="export-all-button"]')).toBeDisabled()
    
    // Hover should show tooltip
    await page.locator('[data-testid="export-all-button"]').hover()
    await expect(page.locator('[data-testid="empty-media-tooltip"]')).toBeVisible()
  })

  test('handles network errors during export', async ({ page }) => {
    // Upload test files
    await page.locator('[data-testid="media-upload-input"]').setInputFiles(
      path.join(__dirname, 'fixtures', 'test-image.jpg')
    )

    // Simulate network failure during export
    await page.route('**/media/**', route => route.abort())
    
    // Attempt export
    await page.locator('[data-testid="export-all-button"]').click()
    
    // Should show error message
    await expect(page.locator('[data-testid="export-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="export-error"]')).toContainText('Export failed')
  })
})
```

#### Windows-Specific Configuration (`playwright.config.ts` updates needed)
```typescript
// Add to existing playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  // ... existing config
  
  projects: [
    {
      name: 'chromium-windows',
      use: { 
        ...devices['Desktop Chrome'],
        // Windows-specific download handling
        acceptDownloads: true,
        // Handle Windows path separators
        contextOptions: {
          acceptDownloads: true
        }
      },
    },
    // Add specific test for Chinese locale
    {
      name: 'chromium-chinese',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'zh-CN',
        acceptDownloads: true
      }
    }
  ],

  // Windows file system considerations
  expect: {
    // Longer timeout for ZIP operations on Windows
    timeout: 10000
  },

  use: {
    // Windows-specific browser launch options
    launchOptions: {
      // Handle Windows defender/antivirus delays
      slowMo: process.platform === 'win32' ? 100 : 0
    }
  }
})
```

#### Test Fixtures Setup (`e2e/fixtures/`)
```bash
# Create test fixtures with various filename encodings
e2e/fixtures/
├── test-image.jpg           # ASCII filename
├── 测试图片.png              # Chinese filename  
├── файл.jpg                 # Cyrillic filename
├── file with spaces.png     # Spaces in filename
├── large-video.mp4          # Large file for cancel testing
└── invalid-chars-<>|.jpg    # Windows invalid chars (for error testing)
```

## 📂 Files to Create/Modify Reference

### 🆕 New Files to Create

| File Path | Purpose | Phase |
|-----------|---------|-------|
| `apps/web/src/components/editor/media-panel/download-all-button.tsx` | Main download all button component | Phase 2 |
| `apps/web/src/components/editor/media-panel/batch-download-modal.tsx` | Progress tracking modal component | Phase 2 |
| `apps/web/src/lib/download-manager.ts` | Core batch download logic and queue management | Phase 1 |
| `apps/web/src/lib/file-naming.ts` | File naming conflict resolution utilities | Phase 1 |
| `apps/web/src/hooks/use-batch-download.ts` | React hook for download state management | Phase 2 |

### 🔄 Existing Files to Modify

| File Path | Modifications Needed | Phase |
|-----------|---------------------|-------|
| `apps/web/src/components/editor/media-panel/views/media.tsx` | Add download all button to header/toolbar | Phase 2 |
| `apps/web/src/lib/image-utils.ts` | Enhance existing download utilities, add batch support | Phase 1 |
| `apps/web/src/stores/media-store.ts` | Add download state if needed (or create separate store) | Phase 1 |
| `apps/web/src/components/editor/media-panel/index.tsx` | Update header layout if button goes in main header | Phase 2 |

### 🧪 Test Files to Create

| File Path | Purpose | Phase |
|-----------|---------|-------|
| `apps/web/src/components/editor/media-panel/__tests__/export-all-button.test.tsx` | Unit tests for export button component | Phase 4 |
| `apps/web/src/lib/__tests__/zip-manager.test.ts` | Unit tests for ZIP manager class | Phase 4 |
| `apps/web/src/lib/__tests__/file-naming.test.ts` | Unit tests for filename conflict resolution | Phase 4 |
| `apps/web/src/hooks/__tests__/use-zip-export.test.ts` | Unit tests for export hook | Phase 4 |
| `apps/web/e2e/export-all-media.spec.ts` | E2E tests with Windows/Chinese support | Phase 4 |
| `apps/web/e2e/fixtures/` | Test media files with Unicode names | Phase 4 |

### 📋 Additional Dependencies for Testing

| Package | Purpose | Installation |
|---------|---------|-------------|
| `node-stream-zip` | ZIP file validation in tests | `npm install --save-dev node-stream-zip @types/node-stream-zip` |
| `@playwright/test` | E2E testing framework | Already included |
| `@testing-library/react` | Component testing utilities | Already included |

### 📖 Documentation Files

| File Path | Purpose | Phase |
|-----------|---------|-------|
| `apps/web/src/components/editor/media-panel/README.md` | Component documentation | Phase 4 |
| `docs/features/download-all-media.md` | Feature documentation | Phase 4 |

## 🚀 Implementation Phases

### Phase 1: Core Foundation (Week 1)
- [ ] Enhanced download utilities
- [ ] Download manager class
- [ ] File naming service
- [ ] Basic error handling

### Phase 2: UI Components (Week 1)
- [ ] Download all button component
- [ ] Progress modal component
- [ ] Integration with media panel
- [ ] Basic styling and UX

### Phase 3: Advanced Features (Week 2)
- [ ] Concurrent download limiting
- [ ] Cancel/pause functionality
- [ ] Advanced progress tracking
- [ ] Error recovery mechanisms

### Phase 4: Polish & Testing (Week 2)
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Documentation

## 🔍 Technical Considerations

### Browser Limitations
- **Download Limits**: Most browsers limit concurrent downloads
- **File Size**: Large files may timeout or fail
- **User Gestures**: Downloads must be triggered by user action
- **Popup Blockers**: Multiple downloads may trigger blocking

### Performance Optimizations
- **Lazy Loading**: Don't load all files into memory
- **Chunked Downloads**: For very large files
- **Queue Management**: Intelligent prioritization
- **Memory Cleanup**: Proper blob URL management

### Security Considerations
- **File Validation**: Ensure files are safe to download
- **CORS Handling**: Handle cross-origin resources
- **Rate Limiting**: Prevent abuse of download feature
- **Error Logging**: Don't expose sensitive information
- **Unicode Security**: Prevent filename injection attacks via Unicode characters
- **Windows Path Security**: Sanitize Windows-specific invalid characters (`<>:"|?*`)

### Windows/Chinese Environment Specific Considerations

#### Filename Encoding Issues
```typescript
// Enhanced filename sanitization for Windows/Chinese
export function sanitizeFilenameForWindows(filename: string): string {
  // Windows reserved characters
  const reservedChars = /[<>:"|?*\x00-\x1f]/g
  
  // Windows reserved names
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
  
  let sanitized = filename.replace(reservedChars, '_')
  
  // Handle reserved names
  if (reservedNames.test(sanitized)) {
    sanitized = `file_${sanitized}`
  }
  
  // Ensure Unicode characters are properly encoded
  return sanitized.normalize('NFC')
}

// JSZip configuration for Chinese/Unicode support
const zipOptions = {
  type: 'blob' as const,
  compression: 'DEFLATE' as const,
  compressionOptions: { level: 6 },
  // Ensure proper Unicode handling
  platform: 'UNIX', // Better Unicode support than DOS
  comment: 'Created by OpenCut - 由OpenCut创建'
}
```

#### Test Environment Setup
```bash
# Windows-specific test setup commands
# Set proper encoding for Chinese characters
chcp 65001

# Install additional dependencies for Windows testing
npm install --save-dev iconv-lite

# Create test fixtures with proper encoding
# Use PowerShell for better Unicode support:
# New-Item -Path "e2e/fixtures/测试图片.png" -ItemType File
```

#### Playwright Configuration Updates
```typescript
// Additional Windows/Chinese test configuration
{
  // Test different encodings
  name: 'chinese-simplified',
  use: {
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    acceptDownloads: true
  }
},
{
  // Test Windows-specific file handling
  name: 'windows-filesystem',
  use: {
    acceptDownloads: true,
    // Longer timeouts for Windows file operations
    actionTimeout: 30000,
    // Handle Windows Defender scanning delays
    expect: { timeout: 15000 }
  }
}
```

## 📊 Success Metrics

### User Experience Metrics
- **Time to Download**: Average time to download all media
- **Success Rate**: Percentage of successful batch downloads
- **User Adoption**: Usage rate of download all feature
- **Error Rate**: Frequency of download failures

### Technical Metrics
- **Memory Usage**: Peak memory during batch downloads
- **Network Efficiency**: Bandwidth utilization
- **Browser Compatibility**: Success across different browsers
- **Performance Impact**: Effect on editor responsiveness

## 🔄 Future Enhancements

### Phase 5: Advanced Features
- **Download Folders**: Organize downloads by type/date
- **Compression Options**: Optional ZIP download
- **Cloud Integration**: Direct upload to cloud storage
- **Batch Processing**: Apply filters/effects before download

### Phase 6: Enterprise Features
- **Download Templates**: Predefined naming schemes
- **Audit Logging**: Track download activities
- **Permissions**: Role-based download restrictions
- **Analytics**: Detailed download statistics

## 📋 Acceptance Criteria

### Must Have
- ✅ Download all media files individually
- ✅ Show download progress for each file
- ✅ Handle naming conflicts automatically
- ✅ Provide cancel functionality
- ✅ Display clear error messages

### Should Have
- ✅ Limit concurrent downloads (3 max)
- ✅ Retry failed downloads automatically
- ✅ Show overall progress percentage
- ✅ Minimize/background download option
- ✅ Success/failure notifications

### Could Have
- ✅ Custom naming patterns
- ✅ Download filtering by type
- ✅ Estimated time remaining
- ✅ Download speed indicator
- ✅ Resume interrupted downloads

## 🎯 Definition of Done

- [ ] All components implemented and tested
- [ ] Integration with existing media panel
- [ ] Comprehensive error handling
- [ ] Performance optimized for 100+ files
- [ ] Cross-browser compatibility verified
- [ ] Accessibility compliance (WCAG 2.1)
- [ ] Documentation updated
- [ ] E2E tests passing
- [ ] Code review completed
- [ ] User acceptance testing passed

---

## 🏁 Next Steps

1. **Review and approve this plan**
2. **Set up development environment**
3. **Create detailed tickets for each phase**
4. **Begin Phase 1 implementation**
5. **Regular progress reviews and adjustments**

This plan provides a solid foundation for implementing a comprehensive "Download All" feature that enhances user productivity while maintaining system performance and reliability.