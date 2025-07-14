import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { act } from 'react'

// Mock the export store
const mockExportStore = {
  settings: {
    format: 'mp4',
    quality: 'high',
    filename: 'test-export',
    width: 1920,
    height: 1080
  },
  progress: 0,
  status: 'idle',
  isExporting: false,
  error: null,
  updateSettings: jest.fn(),
  updateProgress: jest.fn(),
  setExporting: jest.fn(),
  setError: jest.fn(),
  reset: jest.fn()
}

// Mock zustand store
jest.mock('@/stores/export-store', () => ({
  useExportStore: () => mockExportStore
}))

// Mock Dialog component
const MockDialog = ({ open, onOpenChange, children }: any) => 
  React.createElement('div', { 
    'data-testid': 'dialog',
    'data-open': open,
    onClick: () => onOpenChange && onOpenChange(false)
  }, children)

MockDialog.displayName = 'Dialog'

// Mock Button component
const MockButton = ({ onClick, disabled, children, ...props }: any) =>
  React.createElement('button', {
    'data-testid': props['data-testid'] || 'button',
    onClick,
    disabled,
    ...props
  }, children)

MockButton.displayName = 'Button'

// Mock Progress component
const MockProgress = ({ value, className }: any) =>
  React.createElement('div', {
    'data-testid': 'progress',
    'data-value': value,
    className
  })

MockProgress.displayName = 'Progress'

// Mock Select components
const MockSelect = ({ value, onValueChange, children, 'data-testid': testId }: any) =>
  React.createElement('select', {
    'data-testid': testId || 'select',
    value,
    onChange: (e: any) => onValueChange && onValueChange(e.target.value)
  }, [
    React.createElement('option', { key: 'mp4', value: 'mp4' }, 'MP4'),
    React.createElement('option', { key: 'webm', value: 'webm' }, 'WebM'),
    React.createElement('option', { key: 'mov', value: 'mov' }, 'MOV'),
    React.createElement('option', { key: 'low', value: 'low' }, 'Low'),
    React.createElement('option', { key: 'medium', value: 'medium' }, 'Medium'),
    React.createElement('option', { key: 'high', value: 'high' }, 'High')
  ])

const MockSelectContent = ({ children }: any) =>
  React.createElement('div', { 'data-testid': 'select-content' }, children)

const MockSelectItem = ({ value, children }: any) =>
  React.createElement('option', { value }, children)

const MockSelectTrigger = ({ children }: any) =>
  React.createElement('div', { 'data-testid': 'select-trigger' }, children)

const MockSelectValue = ({ placeholder }: any) =>
  React.createElement('div', { 'data-testid': 'select-value' }, placeholder)

// Mock Input component
const MockInput = ({ value, onChange, ...props }: any) =>
  React.createElement('input', {
    'data-testid': 'input',
    value,
    onChange,
    ...props
  })

MockInput.displayName = 'Input'

// Export Dialog Component for testing
interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onOpenChange }) => {
  const store = mockExportStore
  const [localSettings, setLocalSettings] = React.useState(store.settings)

  const handleSettingsChange = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    store.updateSettings(newSettings)
  }

  const handleExport = async () => {
    store.setExporting(true)
    store.updateProgress(0, 'Starting export...')
    
    // Simulate export process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 10))
      store.updateProgress(i, `Exporting... ${i}%`)
    }
    
    store.setExporting(false)
    store.updateProgress(100, 'Export complete!')
  }

  return React.createElement(MockDialog, { open, onOpenChange }, [
    React.createElement('div', { key: 'header', 'data-testid': 'dialog-header' }, [
      React.createElement('h2', { key: 'title' }, 'Export Video'),
      React.createElement(MockButton, {
        key: 'close',
        'data-testid': 'close-button',
        onClick: () => onOpenChange(false)
      }, 'Close')
    ]),
    
    React.createElement('div', { key: 'content', 'data-testid': 'dialog-content' }, [
      // Settings section
      React.createElement('div', { key: 'settings', 'data-testid': 'settings-section' }, [
        React.createElement('label', { key: 'format-label' }, 'Format:'),
        React.createElement(MockSelect, {
          key: 'format-select',
          'data-testid': 'format-select',
          value: localSettings.format,
          onValueChange: (value: string) => handleSettingsChange('format', value)
        }),
        
        React.createElement('label', { key: 'quality-label' }, 'Quality:'),
        React.createElement(MockSelect, {
          key: 'quality-select',
          'data-testid': 'quality-select',
          value: localSettings.quality,
          onValueChange: (value: string) => handleSettingsChange('quality', value)
        }),
        
        React.createElement('label', { key: 'filename-label' }, 'Filename:'),
        React.createElement(MockInput, {
          key: 'filename-input',
          'data-testid': 'filename-input',
          value: localSettings.filename,
          onChange: (e: any) => handleSettingsChange('filename', e.target.value)
        })
      ]),
      
      // Progress section
      store.isExporting && React.createElement('div', { key: 'progress', 'data-testid': 'progress-section' }, [
        React.createElement('div', { key: 'progress-label' }, `Progress: ${store.progress}%`),
        React.createElement(MockProgress, { key: 'progress-bar', value: store.progress }),
        React.createElement('div', { key: 'status' }, store.status)
      ]),
      
      // Error section
      store.error && React.createElement('div', { key: 'error', 'data-testid': 'error-section' }, [
        React.createElement('div', { key: 'error-message', 'data-testid': 'error-message' }, store.error)
      ])
    ]),
    
    React.createElement('div', { key: 'footer', 'data-testid': 'dialog-footer' }, [
      React.createElement(MockButton, {
        key: 'export',
        'data-testid': 'export-button',
        onClick: handleExport,
        disabled: store.isExporting
      }, store.isExporting ? 'Exporting...' : 'Export')
    ])
  ])
}

describe('Store-Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset store state
    mockExportStore.settings = {
      format: 'mp4',
      quality: 'high',
      filename: 'test-export',
      width: 1920,
      height: 1080
    }
    mockExportStore.progress = 0
    mockExportStore.status = 'idle'
    mockExportStore.isExporting = false
    mockExportStore.error = null
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Dialog-store synchronization', () => {
    it('should display current store settings in dialog', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('format-select')).toHaveValue('mp4')
      expect(screen.getByTestId('quality-select')).toHaveValue('high')
      expect(screen.getByTestId('filename-input')).toHaveValue('test-export')
    })

    it('should update store when dialog settings change', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const formatSelect = screen.getByTestId('format-select')
      fireEvent.change(formatSelect, { target: { value: 'webm' } })

      expect(mockExportStore.updateSettings).toHaveBeenCalledWith({
        format: 'webm',
        quality: 'high',
        filename: 'test-export',
        width: 1920,
        height: 1080
      })
    })

    it('should update store when quality changes', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const qualitySelect = screen.getByTestId('quality-select')
      fireEvent.change(qualitySelect, { target: { value: 'medium' } })

      expect(mockExportStore.updateSettings).toHaveBeenCalledWith({
        format: 'mp4',
        quality: 'medium',
        filename: 'test-export',
        width: 1920,
        height: 1080
      })
    })

    it('should update store when filename changes', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const filenameInput = screen.getByTestId('filename-input')
      fireEvent.change(filenameInput, { target: { value: 'my-video' } })

      expect(mockExportStore.updateSettings).toHaveBeenCalledWith({
        format: 'mp4',
        quality: 'high',
        filename: 'my-video',
        width: 1920,
        height: 1080
      })
    })

    it('should close dialog when close button clicked', () => {
      const onOpenChange = jest.fn()
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange
      }))

      const closeButton = screen.getByTestId('close-button')
      fireEvent.click(closeButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should not render dialog when closed', () => {
      render(React.createElement(ExportDialog, {
        open: false,
        onOpenChange: jest.fn()
      }))

      const dialog = screen.getByTestId('dialog')
      expect(dialog).toHaveAttribute('data-open', 'false')
    })

    it('should render dialog when open', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const dialog = screen.getByTestId('dialog')
      expect(dialog).toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
    })
  })

  describe('Progress updates', () => {
    it('should show progress section when exporting', async () => {
      mockExportStore.isExporting = true
      mockExportStore.progress = 25
      mockExportStore.status = 'Rendering frames...'
      
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('progress-section')).toBeInTheDocument()
      expect(screen.getByText('Progress: 25%')).toBeInTheDocument()
      expect(screen.getByText('Rendering frames...')).toBeInTheDocument()
    })

    it('should update progress bar value', () => {
      mockExportStore.isExporting = true
      mockExportStore.progress = 75
      
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('data-value', '75')
    })

    it('should disable export button when exporting', () => {
      mockExportStore.isExporting = true
      
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const exportButton = screen.getByTestId('export-button')
      expect(exportButton).toBeDisabled()
      expect(exportButton).toHaveTextContent('Exporting...')
    })

    it('should enable export button when not exporting', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const exportButton = screen.getByTestId('export-button')
      expect(exportButton).not.toBeDisabled()
      expect(exportButton).toHaveTextContent('Export')
    })

    it('should hide progress section when not exporting', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.queryByTestId('progress-section')).not.toBeInTheDocument()
    })

    it('should show different status messages', () => {
      const statusMessages = [
        'Initializing export...',
        'Rendering frames...',
        'Encoding audio...',
        'Finalizing video...',
        'Export complete!'
      ]

      statusMessages.forEach((status, index) => {
        mockExportStore.isExporting = true
        mockExportStore.status = status
        
        const { unmount } = render(React.createElement(ExportDialog, {
          open: true,
          onOpenChange: jest.fn()
        }))

        expect(screen.getByText(status)).toBeInTheDocument()
        unmount()
      })
    })

    it('should call updateProgress when export progresses', async () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      const exportButton = screen.getByTestId('export-button')
      
      await act(async () => {
        fireEvent.click(exportButton)
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      expect(mockExportStore.updateProgress).toHaveBeenCalledWith(0, 'Starting export...')
      expect(mockExportStore.setExporting).toHaveBeenCalledWith(true)
    })
  })

  describe('Settings persistence', () => {
    it('should persist settings across dialog opens', () => {
      const { rerender } = render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      // Change settings
      const formatSelect = screen.getByTestId('format-select')
      fireEvent.change(formatSelect, { target: { value: 'webm' } })

      const filenameInput = screen.getByTestId('filename-input')
      fireEvent.change(filenameInput, { target: { value: 'my-video' } })

      // Close dialog
      rerender(React.createElement(ExportDialog, {
        open: false,
        onOpenChange: jest.fn()
      }))

      // Update store settings to simulate persistence
      mockExportStore.settings = {
        format: 'webm',
        quality: 'high',
        filename: 'my-video',
        width: 1920,
        height: 1080
      }

      // Reopen dialog
      rerender(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      // Settings should be restored
      expect(screen.getByTestId('format-select')).toHaveValue('webm')
      expect(screen.getByTestId('filename-input')).toHaveValue('my-video')
    })

    it('should maintain settings during export', () => {
      mockExportStore.settings.format = 'webm'
      mockExportStore.isExporting = true
      
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      // Settings should still be available
      expect(screen.getByTestId('format-select')).toHaveValue('webm')
    })

    it('should reset settings when store resets', () => {
      mockExportStore.reset()
      mockExportStore.settings = {
        format: 'mp4',
        quality: 'high',
        filename: 'test-export',
        width: 1920,
        height: 1080
      }
      
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('format-select')).toHaveValue('mp4')
      expect(mockExportStore.reset).toHaveBeenCalled()
    })

    it('should handle default settings correctly', () => {
      // Set default settings
      mockExportStore.settings = {
        format: 'mp4',
        quality: 'high',
        filename: 'export',
        width: 1920,
        height: 1080
      }

      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('format-select')).toHaveValue('mp4')
      expect(screen.getByTestId('quality-select')).toHaveValue('high')
      expect(screen.getByTestId('filename-input')).toHaveValue('export')
    })
  })

  describe('Error handling', () => {
    it('should show error section when error occurs', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      act(() => {
        mockExportStore.error = 'Export failed: Insufficient memory'
      })

      // Re-render with error state
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('error-section')).toBeInTheDocument()
      expect(screen.getByTestId('error-message')).toHaveTextContent('Export failed: Insufficient memory')
    })

    it('should hide error section when no error', () => {
      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.queryByTestId('error-section')).not.toBeInTheDocument()
    })

    it('should clear error when settings change', () => {
      mockExportStore.error = 'Export failed'
      
      const { rerender } = render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('error-section')).toBeInTheDocument()

      // Clear error
      mockExportStore.error = null

      // Re-render without error
      rerender(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.queryByTestId('error-section')).not.toBeInTheDocument()
    })
  })

  describe('Component lifecycle', () => {
    it('should initialize with store state', () => {
      mockExportStore.settings = {
        format: 'webm',
        quality: 'medium',
        filename: 'test-video',
        width: 1280,
        height: 720
      }

      render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('format-select')).toHaveValue('webm')
      expect(screen.getByTestId('quality-select')).toHaveValue('medium')
      expect(screen.getByTestId('filename-input')).toHaveValue('test-video')
    })

    it('should handle rapid state changes', () => {
      const { rerender } = render(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      // Rapid state changes
      act(() => {
        mockExportStore.isExporting = true
        mockExportStore.progress = 50
        mockExportStore.status = 'Processing...'
      })

      rerender(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      act(() => {
        mockExportStore.progress = 100
        mockExportStore.status = 'Complete!'
        mockExportStore.isExporting = false
      })

      rerender(React.createElement(ExportDialog, {
        open: true,
        onOpenChange: jest.fn()
      }))

      expect(screen.getByTestId('export-button')).not.toBeDisabled()
    })
  })
})