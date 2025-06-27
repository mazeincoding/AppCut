import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image, useColorScheme } from 'react-native';

import { Video, ResizeMode } from 'expo-av';
import { Volume2, Clock, Monitor, VolumeX } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';

interface PreviewPanelProps {
  canvasPreset: any;
  onCanvasChange?: (preset: any) => void;
}

const CANVAS_PRESETS = [
  { name: '16:9 HD', width: 1920, height: 1080, ratio: 16/9 },
  { name: '9:16 Mobile', width: 1080, height: 1920, ratio: 9/16 },
  { name: '1:1 Square', width: 1080, height: 1080, ratio: 1 },
  { name: '4:3 Standard', width: 1440, height: 1080, ratio: 4/3 },
  { name: '16:9 4K', width: 3840, height: 2160, ratio: 16/9 },
];

const SPEED_PRESETS = [
  { name: '0.5x', value: 0.5 },
  { name: '0.75x', value: 0.75 },
  { name: '1.0x', value: 1.0 },
  { name: '1.25x', value: 1.25 },
  { name: '1.5x', value: 1.5 },
  { name: '2.0x', value: 2.0 },
];

export function PreviewPanel({ canvasPreset, onCanvasChange }: PreviewPanelProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [canvasModalVisible, setCanvasModalVisible] = useState(false);
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const [currentCanvasPreset, setCurrentCanvasPreset] = useState(canvasPreset);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [activeContent, setActiveContent] = useState<any>(null);
  const videoRef = useRef<Video>(null);
  const screenWidth = Dimensions.get('window').width;

  // Listen to global current time updates
  useEffect(() => {
    const interval = setInterval(() => {
      const globalTime = (global as any).currentTime || 0;
      setCurrentTime(globalTime);
      
      // Find active clips at current time
      const tracks = (global as any).tracks || [];
      let activeClip = null;
      
      for (const track of tracks) {
        for (const clip of track.clips) {
          const clipStart = clip.startTime;
          const clipEnd = clip.startTime + clip.duration;
          
          if (globalTime >= clipStart && globalTime < clipEnd) {
            activeClip = clip;
            break;
          }
        }
        if (activeClip) break;
      }
      
      setActiveContent(activeClip);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Calculate preview dimensions while maintaining aspect ratio
  const maxPreviewWidth = screenWidth - 32;
  const maxPreviewHeight = 300;
  const aspectRatio = currentCanvasPreset.ratio;

  let previewWidth, previewHeight;
  if (maxPreviewWidth / aspectRatio <= maxPreviewHeight) {
    previewWidth = maxPreviewWidth;
    previewHeight = maxPreviewWidth / aspectRatio;
  } else {
    previewHeight = maxPreviewHeight;
    previewWidth = maxPreviewHeight * aspectRatio;
  }

  const handleCanvasChange = (preset: any) => {
    setCurrentCanvasPreset(preset);
    if (onCanvasChange) {
      onCanvasChange(preset);
    }
    setCanvasModalVisible(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderActiveContent = () => {
    if (!activeContent) {
      return (
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{
            fontFamily: 'Inter-Regular',
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center'
          }}>
            No media playing
          </Text>
          <Text style={{
            fontFamily: 'Inter-Regular',
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center',
            marginTop: 4,
          }}>
            Add clips to timeline
          </Text>
        </View>
      );
    }

    if (activeContent.type === 'image' && activeContent.thumbnailUrl) {
      return (
        <Image
          source={{ uri: activeContent.thumbnailUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
        />
      );
    } else if (activeContent.type === 'video' && activeContent.thumbnailUrl) {
      return (
        <Video
          ref={videoRef}
          source={{ uri: activeContent.thumbnailUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={isPlaying}
          isLooping={false}
          onPlaybackStatusUpdate={(status: any) => {
            if (status.isLoaded) {
              setCurrentTime(status.positionMillis / 1000);
              setDuration(status.durationMillis / 1000);
            }
          }}
        />
      );
    }

    return (
      <View style={{
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontFamily: 'Inter-Regular',
          fontSize: 14,
          color: 'rgba(255, 255, 255, 0.7)',
          textAlign: 'center'
        }}>
          {activeContent.name}
        </Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Controls */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}>
        {/* Left side - Canvas and Speed */}
        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: colors.secondary,
            }}
            onPress={() => setCanvasModalVisible(true)}
          >
            <Monitor size={12} color={colors.secondaryForeground} />
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 11,
              color: colors.secondaryForeground,
            }}>
              {currentCanvasPreset.name}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: colors.secondary,
            }}
            onPress={() => setSpeedModalVisible(true)}
          >
            <Clock size={12} color={colors.secondaryForeground} />
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 11,
              color: colors.secondaryForeground,
            }}>
              {speed}x
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center - Time display */}
        <Text style={{
          fontFamily: 'Inter-Regular',
          fontSize: 11,
          color: colors.mutedForeground,
          paddingHorizontal: 8,
        }}>
          {formatTime(currentTime)}
        </Text>

        {/* Right side - Audio control */}
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            backgroundColor: isMuted ? colors.destructive : colors.secondary,
          }}
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX size={12} color={isMuted ? colors.destructiveForeground : colors.secondaryForeground} />
          ) : (
            <Volume2 size={12} color={colors.secondaryForeground} />
          )}
        </TouchableOpacity>
      </View>

      {/* Preview Area */}
      <View style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}>
        {/* Preview Canvas */}
        <View style={{
          width: previewWidth,
          height: previewHeight,
          backgroundColor: '#1a1a1a',
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#333333',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {renderActiveContent()}

          {/* Canvas Info */}
          <View style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 10,
              color: 'white',
            }}>
              {currentCanvasPreset.width}×{currentCanvasPreset.height}
            </Text>
          </View>
        </View>
      </View>

      {/* Canvas Selection Modal */}
      {canvasModalVisible && (
        <View style={{
          position: 'absolute',
          top: 40,
          left: 8,
          backgroundColor: colors.popover,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 8,
          zIndex: 1000,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          {CANVAS_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              onPress={() => handleCanvasChange(preset)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 4,
                backgroundColor: preset.name === currentCanvasPreset.name ? colors.accent : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                color: colors.text,
              }}>
                {preset.name} ({preset.width}×{preset.height})
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setCanvasModalVisible(false)}
            style={{
              marginTop: 8,
              paddingVertical: 4,
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 11,
              color: colors.mutedForeground,
            }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Speed Selection Modal */}
      {speedModalVisible && (
        <View style={{
          position: 'absolute',
          top: 40,
          left: 100,
          backgroundColor: colors.popover,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 8,
          zIndex: 1000,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}>
          {SPEED_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              onPress={() => {
                setSpeed(preset.value);
                setSpeedModalVisible(false);
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 4,
                backgroundColor: preset.value === speed ? colors.accent : 'transparent',
              }}
            >
              <Text style={{
                fontFamily: 'Inter-Regular',
                fontSize: 12,
                color: colors.text,
              }}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setSpeedModalVisible(false)}
            style={{
              marginTop: 8,
              paddingVertical: 4,
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 11,
              color: colors.mutedForeground,
            }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
