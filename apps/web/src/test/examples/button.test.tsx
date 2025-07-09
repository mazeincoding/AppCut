/**
 * Example test file for OpenCut contributors
 * This demonstrates how to write tests for UI components
 * 
 * To run this test:
 * bun test button.test.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../../components/ui/button'
import { useState } from 'react'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick} disabled>Disabled button</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies correct CSS classes for variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-secondary')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')
  })

  it('applies correct CSS classes for sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-8')

    rerender(<Button size="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Keyboard accessible</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)
    
    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })
})

// Example of testing a more complex component with video editor context
describe('Video Editor Button Integration', () => {
  it('handles video upload button click', async () => {
    const user = userEvent.setup()
    const mockFileInput = document.createElement('input')
    mockFileInput.type = 'file'
    mockFileInput.accept = 'video/*'
    
    const handleUpload = vi.fn()
    
    // Mock file input click
    const UploadButton = () => (
      <Button onClick={() => {
        mockFileInput.click()
        handleUpload()
      }}>
        Upload Video
      </Button>
    )
    
    render(<UploadButton />)
    
    await user.click(screen.getByRole('button', { name: /upload video/i }))
    expect(handleUpload).toHaveBeenCalled()
  })

  it('handles timeline play/pause button', async () => {
    const user = userEvent.setup()
    let isPlaying = false
    
    const PlayPauseButton = () => (
      <Button onClick={() => { isPlaying = !isPlaying }}>
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
    )
    
    const { rerender } = render(<PlayPauseButton />)
    
    // Initially shows Play
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
    
    // Click to play
    await user.click(screen.getByRole('button'))
    rerender(<PlayPauseButton />)
    
    // Now shows Pause
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })
})

// Example of testing with async operations (video processing)
describe('Video Processing Button', () => {
  it('shows loading state during video export', async () => {
    const user = userEvent.setup()

    const ExportButton = () => {
      const [isExporting, setIsExporting] = useState(false)

      const handleExport = async () => {
        setIsExporting(true)
        try {
          // Simulate video export
          await new Promise(resolve => setTimeout(resolve, 100))
        } finally {
          setIsExporting(false)
        }
      }

      return (
        <Button
          disabled={isExporting}
          onClick={handleExport}
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
        </Button>
      )
    }

    render(<ExportButton />)

    // Initially shows Export Video
    expect(screen.getByRole('button', { name: /export video/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).not.toBeDisabled()

    // Click to start export
    await user.click(screen.getByRole('button'))

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exporting/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button')).toBeDisabled()

    // Wait for export to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export video/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('handles export errors gracefully', async () => {
    const user = userEvent.setup()
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const ExportButton = () => {
      const [isExporting, setIsExporting] = useState(false)
      const [error, setError] = useState<string | null>(null)

      const handleExport = async () => {
        setIsExporting(true)
        setError(null)
        try {
          // Simulate export failure
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Export failed')), 50)
          )
        } catch (err) {
          setError('Export failed')
          console.error('Export error:', err)
        } finally {
          setIsExporting(false)
        }
      }

      return (
        <div>
          <Button
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? 'Exporting...' : 'Export Video'}
          </Button>
          {error && <div role="alert">{error}</div>}
        </div>
      )
    }

    render(<ExportButton />)

    // Click to start export
    await user.click(screen.getByRole('button', { name: /export video/i }))

    // Wait for loading state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exporting/i })).toBeInTheDocument()
    })

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Export failed')
    })

    // Button should be enabled again
    expect(screen.getByRole('button', { name: /export video/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).not.toBeDisabled()

    mockConsoleError.mockRestore()
  })
})
