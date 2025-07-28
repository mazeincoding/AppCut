'use client'

import { useState } from 'react'
import { Package, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMediaStore } from '@/stores/media-store'
import { useZipExport } from '@/hooks/use-zip-export'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ExportAllButtonProps {
  className?: string
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'text' | 'link' | 'shimmer'
  size?: 'sm' | 'default' | 'lg'
}

export function ExportAllButton({ 
  className, 
  variant = 'outline', 
  size = 'sm' 
}: ExportAllButtonProps) {
  const { mediaItems } = useMediaStore()
  const { exportState, exportToZip, isExporting } = useZipExport()

  const handleExportAll = async () => {
    console.log('📦 EXPORT-ALL: Button clicked!');
    console.log('📊 EXPORT-ALL: Media items analysis', {
      totalItems: mediaItems.length,
      generatedImages: mediaItems.filter(item => item.metadata?.source === 'text2image').length,
      regularImages: mediaItems.filter(item => item.type === 'image' && item.metadata?.source !== 'text2image').length,
      videos: mediaItems.filter(item => item.type === 'video').length,
      audio: mediaItems.filter(item => item.type === 'audio').length
    });
    
    // Log generated images details
    const generatedImages = mediaItems.filter(item => item.metadata?.source === 'text2image');
    if (generatedImages.length > 0) {
      console.log('🖼️ EXPORT-ALL: Generated images found:', generatedImages.map(img => ({
        id: img.id,
        name: img.name,
        hasFile: !!img.file,
        hasUrl: !!img.url,
        urlType: img.url?.startsWith('data:') ? 'data' : img.url?.startsWith('blob:') ? 'blob' : 'other',
        fileSize: img.file?.size || 0,
        metadata: img.metadata
      })));
    }
    
    if (mediaItems.length === 0 || isExporting) {
      console.log('⚠️ EXPORT-ALL: Export blocked', {
        reason: mediaItems.length === 0 ? 'No media items' : 'Already exporting',
        isExporting
      });
      return
    }

    try {
      console.log('🚀 EXPORT-ALL: Starting ZIP export...');
      await exportToZip(mediaItems, {
        filename: `media-export-${Date.now()}.zip`
      })
      
      console.log('✅ EXPORT-ALL: Export completed', {
        phase: exportState.phase,
        totalFiles: exportState.totalFiles,
        completedFiles: exportState.completedFiles
      });
      
      if (exportState.phase === 'complete') {
        toast.success(`Successfully exported ${mediaItems.length} files to ZIP!`)
      }
    } catch (error) {
      console.error('❌ EXPORT-ALL: Export failed:', error)
      toast.error('Failed to export media files')
    }
  }

  const isEmpty = mediaItems.length === 0
  const { phase, progress, completedFiles, totalFiles } = exportState
  
  const getButtonText = () => {
    if (isEmpty) return 'No Media'
    if (!isExporting) return `Export All (${mediaItems.length})`
    
    switch (phase) {
      case 'adding':
        return `Adding Files... ${completedFiles}/${totalFiles}`
      case 'compressing':
        return 'Compressing...'
      case 'downloading':
        return 'Downloading...'
      default:
        return `Exporting... ${progress}%`
    }
  }

  const getProgressColor = () => {
    switch (phase) {
      case 'adding':
        return 'bg-blue-500'
      case 'compressing':
        return 'bg-yellow-500'
      case 'downloading':
        return 'bg-green-500'
      case 'complete':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={handleExportAll}
        disabled={isEmpty || isExporting}
        data-testid="export-all-button"
        className={cn(
          'gap-2 transition-all duration-200 min-w-[120px] !bg-transparent hover:!bg-transparent !border-transparent',
          isExporting && 'cursor-not-allowed',
          className
        )}
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline text-xs font-medium">
              {getButtonText()}
            </span>
            <span className="sm:hidden text-xs">Export</span>
          </>
        ) : (
          <>
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline text-xs font-medium">
              {getButtonText()}
            </span>
            <span className="sm:hidden text-xs">Export</span>
          </>
        )}
      </Button>

      {/* Progress Bar */}
      {isExporting && progress > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-1 rounded-b-md transition-all duration-300"
          style={{ width: `${progress}%` }}
        >
          <div 
            className={cn('h-full rounded-b-md', getProgressColor())}
            data-testid="export-progress"
          />
        </div>
      )}

      {/* Tooltip for empty state */}
      {isEmpty && (
        <div 
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          data-testid="empty-media-tooltip"
        >
          No media to export
        </div>
      )}
    </div>
  )
}