import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, PanResponder, Image, Alert, useColorScheme } from 'react-native';

import { toast } from 'sonner-native';
import { Play, Pause, Plus, Trash2 } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';

interface Track {
  id: string;
  name: string;
  type: 'video' | 'audio';
  clips: Clip[];
  muted: boolean;
}

interface Clip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  type: 'video' | 'image' | 'audio';
  trimStart?: number;
  trimEnd?: number;
  thumbnailUrl?: string;
}

interface TimelineProps {
  canvasPreset: any;
  onCanvasChange: (preset: any) => void;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
}

export const Timeline = forwardRef<any, TimelineProps>(({ canvasPreset, onCanvasChange, isPlaying, onPlayPause }, ref) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [currentTime, setCurrentTime] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'default-track-1',
      name: 'T1',
      type: 'video',
      clips: [],
      muted: false,
    }
  ]);
  const [selectedClips, setSelectedClips] = useState<{trackId: string, clipId: string}[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Single unified scroll ref
  const unifiedScrollRef = useRef<ScrollView>(null);
  
  const playbackTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [totalDuration, setTotalDuration] = useState(10);

  const PIXELS_PER_SECOND = 50;
  const TRACK_HEIGHT = 60;
  const RULER_HEIGHT = 40;
  const TRACK_LABEL_WIDTH = 60;

  // Expose cleanup method to parent
  useImperativeHandle(ref, () => ({
    cleanup: () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    },
    pause: () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    }
  }));

  // Calculate total duration based on clips
  useEffect(() => {
    let maxTime = 10; // Default minimum duration
    
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxTime) {
          maxTime = clipEnd;
        }
      });
    });
    
    setTotalDuration(maxTime);
  }, [tracks]);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackTimer.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= totalDuration) {
            onPlayPause(false);
            return totalDuration;
          }
          // Update global current time for preview panel
          (global as any).currentTime = newTime;
          return newTime;
        });
      }, 100);
    } else {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
    }

    return () => {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
      }
    };
  }, [isPlaying, totalDuration]);

  const handlePlayPause = () => {
    const newPlaying = !isPlaying;
    onPlayPause(newPlaying);
  };

  const handleAddTrack = () => {
    const trackNumber = tracks.length + 1;
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `T${trackNumber}`,
      type: tracks.length % 2 === 0 ? 'video' : 'audio',
      clips: [],
      muted: false,
    };
    setTracks([...tracks, newTrack]);
    toast.success(`Added Track ${trackNumber}`);
  };

  const handleDeleteTrack = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    Alert.alert(
      'Delete Track',
      `Are you sure you want to delete ${track.name}? This will also delete all clips on this track.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setTracks(tracks.filter(t => t.id !== trackId));
            // Clear any selected clips on this track
            setSelectedClips(selectedClips.filter(selected => selected.trackId !== trackId));
            toast.success(`Deleted ${track.name}`);
          }
        }
      ]
    );
  };

  const addClipToTrack = (trackId: string, mediaItem: any) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    // Calculate start time to avoid overlaps
    let startTime = 0;
    if (track.clips.length > 0) {
      const lastClip = track.clips.reduce((latest, clip) => {
        const clipEnd = clip.startTime + clip.duration;
        const latestEnd = latest.startTime + latest.duration;
        return clipEnd > latestEnd ? clip : latest;
      });
      startTime = lastClip.startTime + lastClip.duration;
    }

    const newClip: Clip = {
      id: `clip-${Date.now()}`,
      name: mediaItem.name,
      startTime: startTime,
      duration: mediaItem.duration || 5,
      type: mediaItem.type,
      trimStart: 0,
      trimEnd: 0,
      thumbnailUrl: mediaItem.thumbnailUrl || mediaItem.uri,
    };

    setTracks(tracks.map(t => 
      t.id === trackId 
        ? { ...t, clips: [...t.clips, newClip] }
        : t
    ));
  };

  const deleteSelectedClips = () => {
    if (selectedClips.length === 0) {
      toast.error('No clips selected');
      return;
    }

    const updatedTracks = tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => 
        !selectedClips.some(selected => 
          selected.trackId === track.id && selected.clipId === clip.id
        )
      )
    }));

    setTracks(updatedTracks);
    setSelectedClips([]);
    toast.success(`Deleted ${selectedClips.length} clip(s)`);
  };

  const selectClip = (trackId: string, clipId: string, additive: boolean = false) => {
    if (additive) {
      const isSelected = selectedClips.some(
        selected => selected.trackId === trackId && selected.clipId === clipId
      );
      
      if (isSelected) {
        setSelectedClips(selectedClips.filter(
          selected => !(selected.trackId === trackId && selected.clipId === clipId)
        ));
      } else {
        setSelectedClips([...selectedClips, { trackId, clipId }]);
      }
    } else {
      const isSelected = selectedClips.some(
        selected => selected.trackId === trackId && selected.clipId === clipId
      );
      
      if (isSelected && selectedClips.length === 1) {
        setSelectedClips([]);
      } else {
        setSelectedClips([{ trackId, clipId }]);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Playhead scrubbing with sync
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const locationX = evt.nativeEvent.locationX;
      const newTime = Math.max(0, Math.min(totalDuration, locationX / (PIXELS_PER_SECOND * zoomLevel)));
      setCurrentTime(newTime);
      (global as any).currentTime = newTime;
    },
    onPanResponderMove: (evt) => {
      const locationX = evt.nativeEvent.locationX;
      const newTime = Math.max(0, Math.min(totalDuration, locationX / (PIXELS_PER_SECOND * zoomLevel)));
      setCurrentTime(newTime);
      (global as any).currentTime = newTime;
    },
    onPanResponderRelease: () => {
      // Scrubbing finished
    },
  });

  // Make functions available globally for media modal
  useEffect(() => {
    (global as any).addClipToTrack = addClipToTrack;
    (global as any).tracks = tracks;
    (global as any).currentTime = currentTime;
  }, [tracks, currentTime]);

  // Enhanced ruler with markers
  const renderRulerMarkers = () => {
    const getTimeInterval = (zoom: number) => {
      const pixelsPerSecond = PIXELS_PER_SECOND * zoom;
      if (pixelsPerSecond >= 200) return 0.1;
      if (pixelsPerSecond >= 100) return 0.5;
      if (pixelsPerSecond >= 50) return 1;
      if (pixelsPerSecond >= 25) return 2;
      if (pixelsPerSecond >= 12) return 5;
      if (pixelsPerSecond >= 6) return 10;
      return 30;
    };

    const interval = getTimeInterval(zoomLevel);
    const markerCount = Math.ceil(totalDuration / interval) + 1;

    return Array.from({ length: markerCount }, (_, i) => {
      const time = i * interval;
      if (time > totalDuration) return null;

      const isMainMarker = time % (interval >= 1 ? Math.max(1, interval) : 1) === 0;
      const left = time * PIXELS_PER_SECOND * zoomLevel;

      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: left,
            top: 0,
            bottom: 0,
            borderLeftWidth: 1,
            borderLeftColor: isMainMarker ? colors.mutedForeground + '66' : colors.mutedForeground + '33',
          }}
        >
          <Text style={{
            position: 'absolute',
            top: 4,
            left: 2,
            fontFamily: 'Inter-Regular',
            fontSize: isMainMarker ? 10 : 8,
            color: isMainMarker ? colors.mutedForeground : colors.mutedForeground + '99',
          }}>
            {(() => {
              const formatTime = (seconds: number) => {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;

                if (hours > 0) {
                  return `${hours}:${minutes.toString().padStart(2, '0')}:${Math.floor(secs).toString().padStart(2, '0')}`;
                } else if (minutes > 0) {
                  return `${minutes}:${Math.floor(secs).toString().padStart(2, '0')}`;
                } else if (interval >= 1) {
                  return `${Math.floor(secs)}s`;
                } else {
                  return `${secs.toFixed(1)}s`;
                }
              };
              return formatTime(time);
            })()}
          </Text>
        </View>
      );
    }).filter(Boolean);
  };

  const renderTrackLabel = (track: Track, index: number) => {
    const trackColor = track.type === 'video' ? '#3b82f6' : '#10b981';
    
    return (
      <View
        key={track.id}
        style={{
          height: TRACK_HEIGHT,
          paddingHorizontal: 6,
          justifyContent: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onLongPress={() => handleDeleteTrack(track.id)}
          style={{
            width: 48,
            height: 24,
            backgroundColor: trackColor + '20',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: trackColor + '40',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
          }}
        >
          <Text style={{
            fontFamily: 'Inter-Medium',
            fontSize: 11,
            color: trackColor,
            fontWeight: '600',
            textAlign: 'center',
          }}>
            {track.name}
          </Text>
          {track.muted && (
            <Text style={{
              position: 'absolute',
              top: -4,
              right: -4,
              fontSize: 8,
              color: '#ef4444',
            }}>
              M
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderClip = (clip: Clip, track: Track) => {
    const isSelected = selectedClips.some(
      selected => selected.trackId === track.id && selected.clipId === clip.id
    );
    const effectiveDuration = clip.duration - (clip.trimStart || 0) - (clip.trimEnd || 0);
    const clipWidth = Math.max(80, effectiveDuration * PIXELS_PER_SECOND * zoomLevel);
    const clipLeft = clip.startTime * PIXELS_PER_SECOND * zoomLevel;

    return (
      <TouchableOpacity
        key={clip.id}
        onPress={() => selectClip(track.id, clip.id)}
        style={{
          position: 'absolute',
          left: clipLeft,
          top: 8,
          height: TRACK_HEIGHT - 16,
          width: clipWidth,
          backgroundColor: isSelected ? colors.tint : colors.secondary,
          borderRadius: 4,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.ring : colors.border,
          padding: 4,
          justifyContent: 'center',
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Clip preview */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {clip.thumbnailUrl && (clip.type === 'image' || clip.type === 'video') ? (
            <Image
              source={{ uri: clip.thumbnailUrl }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                marginRight: 8,
              }}
              resizeMode="cover"
            />
          ) : (
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              backgroundColor: clip.type === 'video' ? '#3b82f6' : 
                              clip.type === 'audio' ? '#10b981' : '#8b5cf6',
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ color: 'white', fontSize: 10 }}>
                {clip.type === 'video' ? '🎬' : clip.type === 'audio' ? '🎵' : '🖼️'}
              </Text>
            </View>
          )}
          
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 10,
              color: isSelected 
                ? (colorScheme === 'dark' ? '#171717' : '#fafafa')
                : colors.secondaryForeground,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {clip.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const contentWidth = Math.max(400, totalDuration * PIXELS_PER_SECOND * zoomLevel);
  const contentHeight = RULER_HEIGHT + (tracks.length * TRACK_HEIGHT);

  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      {/* Timeline Toolbar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
      }}>
        <TouchableOpacity 
          style={{ padding: 8, borderRadius: 4 }}
          onPress={handlePlayPause}
        >
          {isPlaying ? (
            <Pause size={16} color={colors.text} />
          ) : (
            <Play size={16} color={colors.text} />
          )}
        </TouchableOpacity>

        <View style={{ width: 1, height: 24, backgroundColor: colors.border }} />

        <Text style={{
          fontFamily: 'Inter-Regular',
          fontSize: 12,
          color: colors.mutedForeground,
          minWidth: 80,
          textAlign: 'center'
        }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </Text>

        <View style={{ flex: 1 }} />

        {/* Delete selected clips button */}
        {selectedClips.length > 0 && (
          <TouchableOpacity 
            style={{ 
              padding: 8,
              backgroundColor: colors.destructive,
              borderRadius: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }} 
            onPress={deleteSelectedClips}
          >
            <Trash2 size={14} color={colors.destructiveForeground} />
            <Text style={{
              fontFamily: 'Inter-Regular',
              fontSize: 12,
              color: colors.destructiveForeground,
            }}>
              Delete ({selectedClips.length})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={{ 
            padding: 8,
            backgroundColor: colors.secondary,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }} 
          onPress={handleAddTrack}
        >
          <Plus size={14} color={colors.secondaryForeground} />
          <Text style={{
            fontFamily: 'Inter-Regular',
            fontSize: 12,
            color: colors.secondaryForeground,
          }}>
            Track
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unified Timeline with Sticky Headers */}
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={unifiedScrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            width: TRACK_LABEL_WIDTH + contentWidth,
            height: Math.max(contentHeight, 200),
          }}
          horizontal
          showsHorizontalScrollIndicator={true}
          scrollEventThrottle={16}
          bounces={false}
          persistentScrollbar={true}
          nestedScrollEnabled={true}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            bounces={false}
          >
            {/* Sticky Header Row */}
            <View 
              style={{ 
                position: 'sticky' as any,
                top: 0,
                flexDirection: 'row',
                height: RULER_HEIGHT,
                zIndex: 20,
                backgroundColor: colors.background,
              }}
            >
              {/* Sticky Corner Header */}
              <View style={{
                position: 'sticky' as any,
                left: 0,
                width: TRACK_LABEL_WIDTH,
                height: RULER_HEIGHT,
                backgroundColor: colors.muted,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderRightColor: colors.border,
                borderBottomColor: colors.border,
                padding: 8,
                justifyContent: 'center',
                zIndex: 30,
              }}>
                <Text style={{
                  fontFamily: 'Inter-Medium',
                  fontSize: 11,
                  color: colors.mutedForeground,
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  {zoomLevel.toFixed(1)}x
                </Text>
              </View>

              {/* Ruler */}
              <View 
                style={{ 
                  width: contentWidth,
                  height: RULER_HEIGHT, 
                  backgroundColor: colors.muted,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  position: 'relative' 
                }}
                {...panResponder.panHandlers}
              >
                {renderRulerMarkers()}

                {/* Ruler playhead */}
                <View
                  style={{
                    position: 'absolute',
                    left: currentTime * PIXELS_PER_SECOND * zoomLevel,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    backgroundColor: '#ef4444',
                    zIndex: 10,
                  }}
                >
                  <View style={{
                    position: 'absolute',
                    top: 2,
                    left: -6,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#ef4444',
                    borderWidth: 2,
                    borderColor: 'white',
                  }} />
                </View>
              </View>
            </View>

            {/* Tracks Content */}
            <View style={{ flexDirection: 'row' }}>
              {/* Sticky Left Column - Track Labels */}
              <View style={{ 
                position: 'sticky' as any,
                left: 0,
                width: TRACK_LABEL_WIDTH, 
                backgroundColor: colors.background,
                zIndex: 10,
              }}>
                {tracks.map((track, index) => renderTrackLabel(track, index))}
              </View>

              {/* Tracks Area */}
              <View style={{ 
                width: contentWidth,
                height: tracks.length * TRACK_HEIGHT,
                position: 'relative',
              }}>
                {tracks.map((track, index) => (
                  <View
                    key={track.id}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: index * TRACK_HEIGHT,
                      height: TRACK_HEIGHT,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      width: contentWidth,
                    }}
                  >
                    {track.clips.length === 0 ? (
                      <View style={{
                        flex: 1,
                        margin: 8,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderStyle: 'dashed',
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{
                          fontFamily: 'Inter-Regular',
                          fontSize: 10,
                          color: colors.mutedForeground,
                        }}>
                          Drop media here
                        </Text>
                      </View>
                    ) : (
                      track.clips.map(clip => renderClip(clip, track))
                    )}
                  </View>
                ))}

                {/* Unified playhead extending through all tracks */}
                <View
                  style={{
                    position: 'absolute',
                    left: currentTime * PIXELS_PER_SECOND * zoomLevel,
                    top: 0,
                    width: 2,
                    height: tracks.length * TRACK_HEIGHT,
                    backgroundColor: '#ef4444',
                    zIndex: 20,
                  }}
                />
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
});
