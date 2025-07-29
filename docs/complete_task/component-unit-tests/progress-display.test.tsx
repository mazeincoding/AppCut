import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock Progress component
const MockProgress = ({ value, className }: { value: number; className?: string }) => 
  React.createElement('div', { 
    'data-testid': 'progress', 
    'data-value': value, 
    className,
    style: { width: `${value}%` }
  })

// Progress Display Component for testing
interface ProgressDisplayProps {
  isExporting: boolean
  progress: number
  status: string
  estimatedTimeRemaining?: number
  currentFrame?: number
  totalFrames?: number
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  isExporting,
  progress,
  status,
  estimatedTimeRemaining,
  currentFrame,
  totalFrames
}) => {
  if (!isExporting) {
    return null
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressColor = (progress: number): string => {
    if (progress < 25) return 'bg-red-500'
    if (progress < 50) return 'bg-yellow-500'
    if (progress < 75) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return React.createElement('div', { 'data-testid': 'progress-display', className: 'space-y-3' }, [
    React.createElement('div', { key: 'header', className: 'flex justify-between items-center' }, [
      React.createElement('span', { key: 'label', 'data-testid': 'progress-label' }, 'Export Progress'),
      React.createElement('span', { 
        key: 'percentage', 
        'data-testid': 'progress-percentage',
        className: 'text-sm font-medium'
      }, `${progress}%`)
    ]),
    React.createElement(MockProgress, { 
      key: 'bar',
      value: progress, 
      className: `w-full h-2 ${getProgressColor(progress)}`
    }),
    React.createElement('div', { key: 'status', className: 'space-y-1' }, [
      React.createElement('p', { 
        key: 'status-text',
        'data-testid': 'progress-status',
        className: 'text-sm text-muted-foreground'
      }, status),
      currentFrame !== undefined && totalFrames !== undefined && 
        React.createElement('p', {
          key: 'frame-info',
          'data-testid': 'frame-info',
          className: 'text-xs text-muted-foreground'
        }, `Frame ${currentFrame} of ${totalFrames}`),
      estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 &&
        React.createElement('p', {
          key: 'time-remaining',
          'data-testid': 'time-remaining',
          className: 'text-xs text-muted-foreground'
        }, `Estimated time remaining: ${formatTime(estimatedTimeRemaining)}`)
    ])
  ])
}

describe('Progress Display', () => {
  describe('Progress bar updates', () => {
    it('should display progress bar with correct value', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 45,
          status: 'Rendering frames...'
        })
      )
      
      const progressBar = screen.getByTestId('progress')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('data-value', '45')
      expect(progressBar).toHaveStyle({ width: '45%' })
    })

    it('should update progress bar value dynamically', () => {
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 25,
          status: 'Starting export...'
        })
      )
      
      let progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('data-value', '25')
      
      // Update progress
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 75,
          status: 'Almost done...'
        })
      )
      
      progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveAttribute('data-value', '75')
    })

    it('should display correct percentage text', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 67,
          status: 'Processing...'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('67%')
    })

    it('should handle 0% progress', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 0,
          status: 'Initializing...'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('0%')
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '0')
    })

    it('should handle 100% progress', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 100,
          status: 'Export complete!'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('100%')
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '100')
    })

    it('should apply different colors based on progress', () => {
      // Test red color for low progress
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 15,
          status: 'Starting...'
        })
      )
      
      let progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveClass('bg-red-500')
      
      // Test yellow for medium-low progress
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 35,
          status: 'Processing...'
        })
      )
      
      progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveClass('bg-yellow-500')
      
      // Test blue for medium-high progress
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 65,
          status: 'Rendering...'
        })
      )
      
      progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveClass('bg-blue-500')
      
      // Test green for high progress
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 85,
          status: 'Finalizing...'
        })
      )
      
      progressBar = screen.getByTestId('progress')
      expect(progressBar).toHaveClass('bg-green-500')
    })
  })

  describe('Status message changes', () => {
    it('should display status message', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 50,
          status: 'Rendering video frames...'
        })
      )
      
      expect(screen.getByTestId('progress-status')).toHaveTextContent('Rendering video frames...')
    })

    it('should update status message', () => {
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 25,
          status: 'Preparing export...'
        })
      )
      
      expect(screen.getByTestId('progress-status')).toHaveTextContent('Preparing export...')
      
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 75,
          status: 'Encoding audio tracks...'
        })
      )
      
      expect(screen.getByTestId('progress-status')).toHaveTextContent('Encoding audio tracks...')
    })

    it('should handle empty status message', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 30,
          status: ''
        })
      )
      
      expect(screen.getByTestId('progress-status')).toHaveTextContent('')
    })

    it('should handle long status messages', () => {
      const longStatus = 'Processing complex video rendering with multiple layers and effects...'
      
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 40,
          status: longStatus
        })
      )
      
      expect(screen.getByTestId('progress-status')).toHaveTextContent(longStatus)
    })
  })

  describe('Loading states', () => {
    it('should not render when not exporting', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: false,
          progress: 50,
          status: 'Should not be visible'
        })
      )
      
      expect(screen.queryByTestId('progress-display')).not.toBeInTheDocument()
    })

    it('should render when exporting starts', () => {
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: false,
          progress: 0,
          status: ''
        })
      )
      
      expect(screen.queryByTestId('progress-display')).not.toBeInTheDocument()
      
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 5,
          status: 'Starting export...'
        })
      )
      
      expect(screen.getByTestId('progress-display')).toBeInTheDocument()
    })

    it('should show frame information when provided', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 60,
          status: 'Rendering frames...',
          currentFrame: 150,
          totalFrames: 250
        })
      )
      
      expect(screen.getByTestId('frame-info')).toHaveTextContent('Frame 150 of 250')
    })

    it('should show estimated time remaining when provided', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 40,
          status: 'Processing...',
          estimatedTimeRemaining: 125 // 2:05
        })
      )
      
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('Estimated time remaining: 2:05')
    })

    it('should format time correctly', () => {
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 30,
          status: 'Processing...',
          estimatedTimeRemaining: 65 // 1:05
        })
      )
      
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('1:05')
      
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 30,
          status: 'Processing...',
          estimatedTimeRemaining: 5 // 0:05
        })
      )
      
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('0:05')
      
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 30,
          status: 'Processing...',
          estimatedTimeRemaining: 3661 // 61:01
        })
      )
      
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('61:01')
    })

    it('should not show time remaining when zero or undefined', () => {
      const { rerender } = render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 50,
          status: 'Processing...',
          estimatedTimeRemaining: 0
        })
      )
      
      expect(screen.queryByTestId('time-remaining')).not.toBeInTheDocument()
      
      rerender(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 50,
          status: 'Processing...'
          // estimatedTimeRemaining undefined
        })
      )
      
      expect(screen.queryByTestId('time-remaining')).not.toBeInTheDocument()
    })

    it('should not show frame info when not provided', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 50,
          status: 'Processing...'
          // currentFrame and totalFrames undefined
        })
      )
      
      expect(screen.queryByTestId('frame-info')).not.toBeInTheDocument()
    })

    it('should show all information when fully populated', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 75,
          status: 'Rendering final frames...',
          currentFrame: 750,
          totalFrames: 1000,
          estimatedTimeRemaining: 45
        })
      )
      
      expect(screen.getByTestId('progress-display')).toBeInTheDocument()
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('75%')
      expect(screen.getByTestId('progress-status')).toHaveTextContent('Rendering final frames...')
      expect(screen.getByTestId('frame-info')).toHaveTextContent('Frame 750 of 1000')
      expect(screen.getByTestId('time-remaining')).toHaveTextContent('0:45')
    })
  })

  describe('Edge cases', () => {
    it('should handle negative progress', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: -5,
          status: 'Invalid progress'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('-5%')
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '-5')
    })

    it('should handle progress over 100%', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 110,
          status: 'Overflowing progress'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('110%')
      expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '110')
    })

    it('should handle decimal progress values', () => {
      render(
        React.createElement(ProgressDisplay, {
          isExporting: true,
          progress: 45.7,
          status: 'Decimal progress'
        })
      )
      
      expect(screen.getByTestId('progress-percentage')).toHaveTextContent('45.7%')
    })
  })
})