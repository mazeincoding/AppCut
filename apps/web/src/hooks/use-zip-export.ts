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