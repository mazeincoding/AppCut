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
        // Get blob from File object directly
        const blob = new Blob([item.file], { type: item.file.type })
        
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
        level: opts.compressionLevel ?? 6
      },
      // Ensure proper Unicode handling
      platform: 'UNIX', // Better Unicode support than DOS
      comment: 'Created by OpenCut'
    })
  }

  private resolveFilename(originalName: string): string {
    const files = Object.keys(this.zip.files)
    let filename = this.sanitizeFilenameForWindows(originalName)
    let counter = 1

    while (files.includes(filename)) {
      const ext = originalName.split('.').pop()
      const base = originalName.replace(`.${ext}`, '')
      filename = `${this.sanitizeFilenameForWindows(base)} (${counter}).${ext}`
      counter++
    }

    return filename
  }

  private sanitizeFilenameForWindows(filename: string): string {
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