/**
 * Test data fixtures for E2E tests
 * Contains sample media files, timeline configurations, and test scenarios
 */

export const TEST_MEDIA = {
  // Sample video URLs for testing (using placeholder videos)
  videos: {
    short: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    medium: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    long: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
  },
  
  // Sample audio files
  audio: {
    music: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    voiceover: 'https://www.soundjay.com/misc/sounds/typing-sound.wav'
  },
  
  // Sample images
  images: {
    logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2FjYyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TG9nbzwvdGV4dD48L3N2Zz4=',
    overlay: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzNmM2YzZiIgb3BhY2l0eT0iMC41Ii8+PHRleHQgeD0iMTAwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T3ZlcmxheTwvdGV4dD48L3N2Zz4='
  }
}

export const TEST_PROJECTS = {
  simple: {
    name: 'Simple Video Project',
    description: 'A basic project with one video track',
    timeline: {
      duration: 10,
      tracks: [
        {
          type: 'video',
          elements: [
            {
              type: 'video',
              src: TEST_MEDIA.videos.short,
              startTime: 0,
              duration: 10,
              x: 0,
              y: 0,
              width: 1920,
              height: 1080
            }
          ]
        }
      ]
    }
  },
  
  complex: {
    name: 'Complex Multi-Track Project',
    description: 'A project with video, audio, text, and image elements',
    timeline: {
      duration: 30,
      tracks: [
        {
          type: 'video',
          elements: [
            {
              type: 'video',
              src: TEST_MEDIA.videos.medium,
              startTime: 0,
              duration: 20,
              x: 0,
              y: 0,
              width: 1920,
              height: 1080
            }
          ]
        },
        {
          type: 'audio',
          elements: [
            {
              type: 'audio',
              src: TEST_MEDIA.audio.music,
              startTime: 5,
              duration: 20,
              volume: 0.5
            }
          ]
        },
        {
          type: 'text',
          elements: [
            {
              type: 'text',
              content: 'Sample Title',
              startTime: 2,
              duration: 5,
              x: 100,
              y: 100,
              fontSize: 48,
              color: '#ffffff'
            }
          ]
        },
        {
          type: 'image',
          elements: [
            {
              type: 'image',
              src: TEST_MEDIA.images.logo,
              startTime: 10,
              duration: 10,
              x: 50,
              y: 50,
              width: 100,
              height: 100
            }
          ]
        }
      ]
    }
  }
}

export const EXPORT_SETTINGS = {
  mp4High: {
    format: 'MP4',
    quality: 'HIGH',
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitrate: 8000000,
    audioBitrate: 320000,
    filename: 'test-export-high.mp4'
  },
  
  webmMedium: {
    format: 'WEBM',
    quality: 'MEDIUM', 
    width: 1280,
    height: 720,
    fps: 30,
    videoBitrate: 4000000,
    audioBitrate: 192000,
    filename: 'test-export-medium.webm'
  },
  
  mp4Low: {
    format: 'MP4',
    quality: 'LOW',
    width: 854,
    height: 480,
    fps: 24,
    videoBitrate: 1000000,
    audioBitrate: 128000,
    filename: 'test-export-low.mp4'
  }
}

export const USER_SCENARIOS = {
  newUser: {
    email: 'newuser@example.com',
    name: 'New User',
    workflow: 'Create account → Upload video → Basic edit → Export'
  },
  
  experiencedUser: {
    email: 'experienced@example.com',
    name: 'Experienced User',
    workflow: 'Login → Create complex project → Advanced editing → Multiple exports'
  },
  
  mobileUser: {
    email: 'mobile@example.com',
    name: 'Mobile User',
    workflow: 'Access on mobile → Upload video → Quick edits → Export'
  }
}

// Helper functions for test data generation
export function createMockVideoFile(name: string = 'test-video.mp4', size: number = 1024000): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type: 'video/mp4' })
}

export function createMockAudioFile(name: string = 'test-audio.mp3', size: number = 256000): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type: 'audio/mp3' })
}

export function createMockImageFile(name: string = 'test-image.jpg', size: number = 51200): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type: 'image/jpeg' })
}

export function generateTimelineElements(count: number = 5) {
  const elements = []
  const elementTypes = ['video', 'audio', 'text', 'image']
  
  for (let i = 0; i < count; i++) {
    const type = elementTypes[i % elementTypes.length]
    const startTime = i * 2
    
    elements.push({
      id: `element-${i}`,
      type,
      startTime,
      duration: 3,
      ...(type === 'video' && {
        src: TEST_MEDIA.videos.short,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080
      }),
      ...(type === 'audio' && {
        src: TEST_MEDIA.audio.music,
        volume: 0.7
      }),
      ...(type === 'text' && {
        content: `Text Element ${i}`,
        x: 100 + (i * 50),
        y: 100,
        fontSize: 32,
        color: '#ffffff'
      }),
      ...(type === 'image' && {
        src: TEST_MEDIA.images.overlay,
        x: 50 + (i * 100),
        y: 50,
        width: 200,
        height: 100
      })
    })
  }
  
  return elements
}