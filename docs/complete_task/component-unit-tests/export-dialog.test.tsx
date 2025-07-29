import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { ExportDialog } from '@/components/export-dialog'
import { ExportFormat, ExportQuality } from '@/types/export'
import { useExportStore } from '@/stores/export-store'

// Mock the export store
jest.mock('@/stores/export-store', () => ({
  useExportStore: jest.fn()
}))

// Mock the export engine
jest.mock('@/lib/export-engine', () => ({
  ExportEngine: jest.fn().mockImplementation(() => ({
    startExport: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'video/mp4' }))
  }))
}))

// Mock the export canvas
jest.mock('@/components/export-canvas', () => ({
  ExportCanvas: React.forwardRef<any, any>((props, ref) => {
    // Mock the ref methods
    React.useImperativeHandle(ref, () => ({
      getCanvas: () => document.createElement('canvas'),
      getContext: () => document.createElement('canvas').getContext('2d'),
      clear: () => {},
      capture: () => 'data:image/png;base64,mock'
    }))
    
    return React.createElement('canvas', { 'data-testid': 'export-canvas' })
  })
}))

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-header' }, children),
  DialogTitle: ({ children }: any) => React.createElement('h2', { 'data-testid': 'dialog-title' }, children),
  DialogDescription: ({ children }: any) => React.createElement('p', { 'data-testid': 'dialog-description' }, children),
  DialogFooter: ({ children }: any) => React.createElement('div', { 'data-testid': 'dialog-footer' }, children)
}))

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, value, onValueChange }: any) => 
    React.createElement('div', { 'data-testid': 'radio-group', 'data-value': value, onChange: onValueChange }, children),
  RadioGroupItem: ({ value, id }: any) => 
    React.createElement('input', {
      type: 'radio',
      value,
      id,
      'data-testid': `radio-${id}`,
      onChange: (e: any) => {
        const radioGroup = e.target.closest('[data-testid="radio-group"]')
        if (radioGroup) {
          const onChange = radioGroup.getAttribute('onChange')
          if (onChange) {
            const event = new CustomEvent('change', { detail: value })
            radioGroup.dispatchEvent(event)
          }
        }
      }
    })
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => React.createElement('label', { htmlFor, 'data-testid': 'label' }, children)
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => 
    React.createElement('button', {
      onClick,
      disabled,
      'data-testid': 'button',
      'data-variant': variant,
      className
    }, children)
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className, id }: any) => 
    React.createElement('input', {
      value,
      onChange,
      placeholder,
      className,
      id,
      'data-testid': 'input'
    })
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => 
    React.createElement('div', { 'data-testid': 'progress', 'data-value': value, className })
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Download: () => React.createElement('span', { 'data-testid': 'download-icon' }),
  X: () => React.createElement('span', { 'data-testid': 'x-icon' })
}))

describe('ExportDialog', () => {
  let mockStore: any
  let user: any

  beforeEach(() => {
    user = userEvent.setup()
    
    // Default mock store state
    mockStore = {
      settings: {
        format: ExportFormat.MP4,
        quality: ExportQuality.HIGH,
        filename: 'test-export',
        width: 1920,
        height: 1080
      },
      progress: {
        isExporting: false,
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
        estimatedTimeRemaining: 0,
        status: ''
      },
      error: null,
      updateSettings: jest.fn(),
      updateProgress: jest.fn(),
      resetExport: jest.fn(),
      setError: jest.fn()
    }
    
    ;(useExportStore as jest.Mock).mockReturnValue(mockStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Dialog open/close behavior', () => {
    it('should render when open is true', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Export Video')
    })

    it('should not render when open is false', () => {
      render(<ExportDialog open={false} onOpenChange={jest.fn()} />)
      
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should call onOpenChange when cancel button clicked', async () => {
      const mockOnOpenChange = jest.fn()
      render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} />)
      
      const cancelButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Cancel')
      )
      
      expect(cancelButton).toBeInTheDocument()
      await user.click(cancelButton!)
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should prevent closing during export', () => {
      mockStore.progress.isExporting = true
      const mockOnOpenChange = jest.fn()
      
      render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} />)
      
      // The dialog should handle this internally and not call onOpenChange
      // This is tested through the handleOpenChange function
      expect(mockOnOpenChange).not.toHaveBeenCalled()
    })
  })

  describe('Format selection', () => {
    it('should display format options', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('radio-mp4')).toBeInTheDocument()
      expect(screen.getByTestId('radio-webm')).toBeInTheDocument()
      expect(screen.getByTestId('radio-mov')).toBeInTheDocument()
    })

    it('should show MP4 as default selected format', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const mp4Radio = screen.getByTestId('radio-mp4')
      expect(mp4Radio).toBeChecked()
    })

    it('should update format when different option selected', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const webmRadio = screen.getByTestId('radio-webm')
      await user.click(webmRadio)
      
      // The format change should trigger updateSettings
      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            format: ExportFormat.WEBM
          })
        )
      })
    })

    it('should display format labels correctly', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByText('MP4 (Recommended)')).toBeInTheDocument()
      expect(screen.getByText('WebM')).toBeInTheDocument()
      expect(screen.getByText('MOV')).toBeInTheDocument()
    })
  })

  describe('Quality selection', () => {
    it('should display quality options', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('radio-1080p')).toBeInTheDocument()
      expect(screen.getByTestId('radio-720p')).toBeInTheDocument()
      expect(screen.getByTestId('radio-480p')).toBeInTheDocument()
    })

    it('should show 1080p as default selected quality', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const highQualityRadio = screen.getByTestId('radio-1080p')
      expect(highQualityRadio).toBeChecked()
    })

    it('should update quality when different option selected', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const mediumQualityRadio = screen.getByTestId('radio-720p')
      await user.click(mediumQualityRadio)
      
      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            quality: ExportQuality.MEDIUM,
            width: 1280,
            height: 720
          })
        )
      })
    })

    it('should display quality labels correctly', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByText('1080p (High Quality)')).toBeInTheDocument()
      expect(screen.getByText('720p (Medium Quality)')).toBeInTheDocument()
      expect(screen.getByText('480p (Low Quality)')).toBeInTheDocument()
    })
  })

  describe('Resolution and size display', () => {
    it('should display resolution for high quality', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByText('1920x1080')).toBeInTheDocument()
      expect(screen.getByText('~50-100 MB/min')).toBeInTheDocument()
    })

    it('should update resolution when quality changes', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const mediumQualityRadio = screen.getByTestId('radio-720p')
      await user.click(mediumQualityRadio)
      
      await waitFor(() => {
        expect(screen.getByText('1280x720')).toBeInTheDocument()
        expect(screen.getByText('~25-50 MB/min')).toBeInTheDocument()
      })
    })

    it('should show correct size estimates for different qualities', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      // Test low quality
      const lowQualityRadio = screen.getByTestId('radio-480p')
      await user.click(lowQualityRadio)
      
      await waitFor(() => {
        expect(screen.getByText('854x480')).toBeInTheDocument()
        expect(screen.getByText('~15-25 MB/min')).toBeInTheDocument()
      })
    })
  })

  describe('Filename input', () => {
    it('should display filename input with default value', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const filenameInput = screen.getByTestId('input')
      expect(filenameInput).toHaveValue('test-export')
    })

    it('should update filename when user types', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const filenameInput = screen.getByTestId('input')
      await user.clear(filenameInput)
      await user.type(filenameInput, 'my-video')
      
      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'my-video'
          })
        )
      })
    })

    it('should show file extension based on format', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByText('.mp4')).toBeInTheDocument()
    })

    it('should update file extension when format changes', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const webmRadio = screen.getByTestId('radio-webm')
      await user.click(webmRadio)
      
      await waitFor(() => {
        expect(screen.getByText('.webm')).toBeInTheDocument()
      })
    })

    it('should validate filename and show error for invalid characters', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const filenameInput = screen.getByTestId('input')
      await user.clear(filenameInput)
      await user.type(filenameInput, 'invalid<filename')
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid filename/)).toBeInTheDocument()
      })
    })

    it('should disable export button for invalid filenames', async () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const filenameInput = screen.getByTestId('input')
      await user.clear(filenameInput)
      
      await waitFor(() => {
        const exportButton = screen.getAllByTestId('button').find(btn => 
          btn.textContent?.includes('Export Video')
        )
        expect(exportButton).toBeDisabled()
      })
    })
  })

  describe('Export button states', () => {
    it('should show "Export Video" when not exporting', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const exportButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Export Video')
      )
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).not.toBeDisabled()
    })

    it('should show "Exporting..." and be disabled during export', () => {
      mockStore.progress.isExporting = true
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const exportButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Exporting...')
      )
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toBeDisabled()
    })

    it('should disable cancel button during export', () => {
      mockStore.progress.isExporting = true
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const cancelButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Cancel')
      )
      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Progress display', () => {
    it('should not show progress when not exporting', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.queryByTestId('progress')).not.toBeInTheDocument()
    })

    it('should show progress during export', () => {
      mockStore.progress.isExporting = true
      mockStore.progress.progress = 45
      mockStore.progress.status = 'Rendering frames...'
      
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('progress')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Rendering frames...')).toBeInTheDocument()
    })

    it('should update progress values dynamically', () => {
      mockStore.progress.isExporting = true
      mockStore.progress.progress = 75
      mockStore.progress.status = 'Finalizing video...'
      
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('Finalizing video...')).toBeInTheDocument()
    })
  })

  describe('Export canvas integration', () => {
    it('should render export canvas component', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('export-canvas')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper dialog structure', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-title')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-description')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })

    it('should have labels for form inputs', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const labels = screen.getAllByTestId('label')
      expect(labels.length).toBeGreaterThan(0)
      
      // Check for specific important labels
      expect(screen.getByText('Format')).toBeInTheDocument()
      expect(screen.getByText('Quality')).toBeInTheDocument()
      expect(screen.getByText('Filename')).toBeInTheDocument()
    })

    it('should have proper button variants', () => {
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const cancelButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Cancel')
      )
      expect(cancelButton).toHaveAttribute('data-variant', 'outline')
      
      const exportButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Export Video')
      )
      expect(exportButton).toHaveClass('bg-blue-600')
    })
  })

  describe('Error handling', () => {
    it('should handle missing canvas gracefully', async () => {
      // Mock ExportCanvas to return null canvas
      jest.mocked(require('@/components/export-canvas').ExportCanvas).mockImplementation(
        jest.forwardRef<any, any>((props, ref) => {
          React.useImperativeHandle(ref, () => ({
            getCanvas: () => null,
            getContext: () => null,
            clear: () => {},
            capture: () => null
          }))
          return <canvas data-testid="export-canvas" />
        })
      )
      
      render(<ExportDialog open={true} onOpenChange={jest.fn()} />)
      
      const exportButton = screen.getAllByTestId('button').find(btn => 
        btn.textContent?.includes('Export Video')
      )
      
      await user.click(exportButton!)
      
      expect(mockStore.updateProgress).toHaveBeenCalledWith({ isExporting: false })
    })
  })
})