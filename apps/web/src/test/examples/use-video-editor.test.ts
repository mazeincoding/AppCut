/**
 * Example test file for custom hooks in OpenCut
 * This demonstrates how to test video editor specific hooks
 * 
 * To run this test:
 * bun test use-video-editor.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createMockVideoFile, createMockVideoClip, createMockTimelineTrack } from '../utils'

// Example hook (this would be imported from your actual hook)
interface VideoClip {
  id: string
  type: 'video' | 'audio'
  startTime: number
  duration: number
  file: File
  trimStart: number
  trimEnd: number
}

interface TimelineTrack {
  id: string
  type: 'video' | 'audio'
  clips: VideoClip[]
  muted: boolean
  volume: number
  locked: boolean
}

interface VideoEditorState {
  tracks: TimelineTrack[]
  currentTime: number
  isPlaying: boolean
  duration: number
  selectedClipId: string | null
}

const useVideoEditor = () => {
  const [state, setState] = React.useState<VideoEditorState>({
    tracks: [],
    currentTime: 0,
    isPlaying: false,
    duration: 0,
    selectedClipId: null,
  })

  const addTrack = (type: 'video' | 'audio') => {
    const newTrack: TimelineTrack = {
      id: `track-${Date.now()}`,
      type,
      clips: [],
      muted: false,
      volume: 1,
      locked: false,
    }
    setState(prev => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }))
    return newTrack.id
  }

  const addClip = (trackId: string, clip: VideoClip) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, clip] }
          : track
      ),
    }))
  }

  const removeClip = (clipId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(clip => clip.id !== clipId),
      })),
      selectedClipId: prev.selectedClipId === clipId ? null : prev.selectedClipId,
    }))
  }

  const selectClip = (clipId: string | null) => {
    setState(prev => ({ ...prev, selectedClipId: clipId }))
  }

  const setCurrentTime = (time: number) => {
    setState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(time, prev.duration)) }))
  }

  const setDuration = (duration: number) => {
    setState(prev => ({ ...prev, duration: Math.max(0, duration) }))
  }

  const play = () => {
    setState(prev => ({ ...prev, isPlaying: true }))
  }

  const pause = () => {
    setState(prev => ({ ...prev, isPlaying: false }))
  }

  const togglePlayPause = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }

  return {
    ...state,
    addTrack,
    addClip,
    removeClip,
    selectClip,
    setCurrentTime,
    setDuration,
    play,
    pause,
    togglePlayPause,
  }
}

// Mock React for the hook
const React = {
  useState: vi.fn(),
}

describe('useVideoEditor Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useState implementation
    let state: VideoEditorState = {
      tracks: [],
      currentTime: 0,
      isPlaying: false,
      duration: 0,
      selectedClipId: null,
    }
    
    React.useState.mockImplementation((initialState) => [
      state,
      (newState: any) => {
        if (typeof newState === 'function') {
          state = newState(state)
        } else {
          state = newState
        }
      },
    ])
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    expect(result.current.tracks).toEqual([])
    expect(result.current.currentTime).toBe(0)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.duration).toBe(0)
    expect(result.current.selectedClipId).toBeNull()
  })

  it('adds a new video track', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    act(() => {
      const trackId = result.current.addTrack('video')
      expect(trackId).toBeDefined()
      expect(typeof trackId).toBe('string')
    })
    
    expect(result.current.tracks).toHaveLength(1)
    expect(result.current.tracks[0].type).toBe('video')
    expect(result.current.tracks[0].clips).toEqual([])
    expect(result.current.tracks[0].muted).toBe(false)
    expect(result.current.tracks[0].volume).toBe(1)
  })

  it('adds a new audio track', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    act(() => {
      result.current.addTrack('audio')
    })
    
    expect(result.current.tracks).toHaveLength(1)
    expect(result.current.tracks[0].type).toBe('audio')
  })

  it('adds multiple tracks', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    act(() => {
      result.current.addTrack('video')
      result.current.addTrack('audio')
      result.current.addTrack('video')
    })
    
    expect(result.current.tracks).toHaveLength(3)
    expect(result.current.tracks[0].type).toBe('video')
    expect(result.current.tracks[1].type).toBe('audio')
    expect(result.current.tracks[2].type).toBe('video')
  })

  it('adds a clip to a track', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    let trackId: string
    act(() => {
      trackId = result.current.addTrack('video')
    })
    
    const mockClip = createMockVideoClip('clip-1', 0, 5)
    
    act(() => {
      result.current.addClip(trackId, mockClip)
    })
    
    expect(result.current.tracks[0].clips).toHaveLength(1)
    expect(result.current.tracks[0].clips[0]).toEqual(mockClip)
  })

  it('removes a clip from tracks', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    let trackId: string
    act(() => {
      trackId = result.current.addTrack('video')
    })
    
    const mockClip = createMockVideoClip('clip-1', 0, 5)
    
    act(() => {
      result.current.addClip(trackId, mockClip)
    })
    
    expect(result.current.tracks[0].clips).toHaveLength(1)
    
    act(() => {
      result.current.removeClip('clip-1')
    })
    
    expect(result.current.tracks[0].clips).toHaveLength(0)
  })

  it('selects and deselects clips', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    act(() => {
      result.current.selectClip('clip-1')
    })
    
    expect(result.current.selectedClipId).toBe('clip-1')
    
    act(() => {
      result.current.selectClip(null)
    })
    
    expect(result.current.selectedClipId).toBeNull()
  })

  it('deselects clip when it is removed', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    let trackId: string
    act(() => {
      trackId = result.current.addTrack('video')
    })
    
    const mockClip = createMockVideoClip('clip-1', 0, 5)
    
    act(() => {
      result.current.addClip(trackId, mockClip)
      result.current.selectClip('clip-1')
    })
    
    expect(result.current.selectedClipId).toBe('clip-1')
    
    act(() => {
      result.current.removeClip('clip-1')
    })
    
    expect(result.current.selectedClipId).toBeNull()
  })

  it('controls playback state', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    expect(result.current.isPlaying).toBe(false)
    
    act(() => {
      result.current.play()
    })
    
    expect(result.current.isPlaying).toBe(true)
    
    act(() => {
      result.current.pause()
    })
    
    expect(result.current.isPlaying).toBe(false)
  })

  it('toggles play/pause state', () => {
    const { result } = renderHook(() => useVideoEditor())
    
    expect(result.current.isPlaying).toBe(false)
    
    act(() => {
      result.current.togglePlayPause()
    })
    
    expect(result.current.isPlaying).toBe(true)
    
    act(() => {
      result.current.togglePlayPause()
    })
    
    expect(result.current.isPlaying).toBe(false)
  })

  it('sets current time within bounds', () => {
    const { result } = renderHook(() => useVideoEditor())

    // Set duration to 10 seconds first
    act(() => {
      result.current.setDuration(10)
    })

    expect(result.current.duration).toBe(10)

    // Test setting time within bounds
    act(() => {
      result.current.setCurrentTime(5)
    })

    expect(result.current.currentTime).toBe(5)

    // Test lower bound
    act(() => {
      result.current.setCurrentTime(-1)
    })

    expect(result.current.currentTime).toBe(0)

    // Test upper bound - should be clamped to duration (10)
    act(() => {
      result.current.setCurrentTime(15)
    })

    expect(result.current.currentTime).toBe(10) // Clamped to duration
  })

  it('sets duration correctly', () => {
    const { result } = renderHook(() => useVideoEditor())

    expect(result.current.duration).toBe(0) // Initial duration

    act(() => {
      result.current.setDuration(30)
    })

    expect(result.current.duration).toBe(30)

    // Test that negative duration is clamped to 0
    act(() => {
      result.current.setDuration(-5)
    })

    expect(result.current.duration).toBe(0)
  })
})
