import React, { useState, useRef } from 'react';
import { View, StatusBar, SafeAreaView, useColorScheme } from 'react-native';

import { Stack } from 'expo-router';

import { Timeline } from '@/components/editor/timeline';
import { MediaModal } from '@/components/editor/media-modal';
import { ToolsModal } from '@/components/editor/tools-modal';
import { PreviewPanel } from '@/components/editor/preview-panel';
import { EditorHeader } from '@/components/editor/editor-header';
import { BottomToolbar } from '@/components/editor/bottom-toolbar';

import { Colors } from '@/constants/Colors';

import { toast } from 'sonner-native';

const CANVAS_PRESETS = [
  { name: '16:9 HD', width: 1920, height: 1080, ratio: 16/9 },
  { name: '9:16 Mobile', width: 1080, height: 1920, ratio: 9/16 },
  { name: '1:1 Square', width: 1080, height: 1080, ratio: 1 },
  { name: '4:3 Standard', width: 1440, height: 1080, ratio: 4/3 },
  { name: '16:9 4K', width: 3840, height: 2160, ratio: 16/9 },
];

export default function EditorScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [canvasPreset, setCanvasPreset] = useState(CANVAS_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const timelineRef = useRef<any>(null);

  // TODO: Remove console logs in production

  const handleMediaPress = () => {
    try {
      setMediaModalVisible(true);
    } catch (error) {
      console.error('Error opening media modal:', error);
    }
  };

  const handleToolsPress = () => {
    try {
      setToolsModalVisible(true);
    } catch (error) {
      console.error('Error opening tools modal:', error);
    }
  };

  const handleMediaModalClose = () => {
    try {
      setMediaModalVisible(false);
    } catch (error) {
      console.error('Error closing media modal:', error);
    }
  };

  const handleToolsModalClose = () => {
    try {
      setToolsModalVisible(false);
    } catch (error) {
      console.error('Error closing tools modal:', error);
    }
  };

  const handleAddToTimeline = (item: any) => {
    // Add item to the first available track or create new track
    const addClipToTrack = (global as any).addClipToTrack;
    const tracks = (global as any).tracks;
    
    if (addClipToTrack && tracks) {
      // Find compatible track or use first track
      const compatibleTrack = tracks.find((track: any) => 
        (track.type === 'video' && (item.type === 'video' || item.type === 'image')) ||
        (track.type === 'audio' && item.type === 'audio')
      );
      
      if (compatibleTrack) {
        addClipToTrack(compatibleTrack.id, item);
      } else {
        toast.error(`No compatible track found for ${item.type}`);
      }
    } else {
      toast.error('Timeline not ready');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <EditorHeader />

      {/* Main Content */}
      <View className="flex-1">
        {/* Video Preview - Takes most of the space */}
        <View className="flex-1 bg-black">
          <PreviewPanel 
            canvasPreset={canvasPreset} 
            onCanvasChange={setCanvasPreset}
          />
        </View>

        {/* Timeline - Compact bottom section */}
        <View
          className="border-t"
          style={{
            height: 192,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          }}
        >
          <Timeline 
            ref={timelineRef}
            canvasPreset={canvasPreset}
            onCanvasChange={setCanvasPreset}
            isPlaying={isPlaying}
            onPlayPause={(playing: boolean) => setIsPlaying(playing)}
          />
        </View>
      </View>

      {/* Bottom Toolbar */}
      <BottomToolbar
        onMediaPress={handleMediaPress}
        onToolsPress={handleToolsPress}
        isPlaying={isPlaying}
        isMuted={isMuted}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onMuteToggle={() => setIsMuted(!isMuted)}
      />

      {/* Modals */}
      <MediaModal
        visible={mediaModalVisible}
        onClose={handleMediaModalClose}
        onAddToTimeline={handleAddToTimeline}
      />
      <ToolsModal
        visible={toolsModalVisible}
        onClose={handleToolsModalClose}
        canvasPreset={canvasPreset}
        onCanvasChange={setCanvasPreset}
        speed={speed}
        onSpeedChange={setSpeed}
      />
    </SafeAreaView>
  );
}
