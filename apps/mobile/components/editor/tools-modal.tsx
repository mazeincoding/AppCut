import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';

import { X, Monitor, Gauge } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';

interface ToolsModalProps {
  visible: boolean;
  onClose: () => void;
  canvasPreset?: any;
  onCanvasChange?: (preset: any) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
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

export function ToolsModal({ 
  visible, 
  onClose, 
  canvasPreset,
  onCanvasChange,
  speed = 1.0,
  onSpeedChange
}: ToolsModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleCanvasChange = (preset: any) => {
    if (onCanvasChange) {
      onCanvasChange(preset);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <Text className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 font-['Inter-SemiBold']">
            Project Settings
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Canvas Settings */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4 gap-2">
              <Monitor size={20} color={colors.text} />
              <Text className="font-semibold text-base text-zinc-900 dark:text-zinc-100 font-['Inter-SemiBold']">
                Canvas Size
              </Text>
            </View>

            <View className="gap-2">
              {CANVAS_PRESETS.map((preset) => {
                const isSelected = canvasPreset?.width === preset.width && 
                                 canvasPreset?.height === preset.height;
                return (
                  <TouchableOpacity
                    key={preset.name}
                    onPress={() => handleCanvasChange(preset)}
                    className={`
                      rounded-lg border px-4 py-4 mb-0
                      ${isSelected ? "bg-blue-500 border-blue-600" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}
                    `}
                    style={isSelected ? { backgroundColor: colors.tint, borderColor: colors.ring } : undefined}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text className="font-medium text-sm" style={{
                        color: isSelected 
                          ? (colorScheme === 'dark' ? '#171717' : '#fafafa')
                          : colors.text,
                      }}>
                        {preset.name}
                      </Text>
                      <Text className="font-normal text-xs" style={{
                        color: isSelected 
                          ? (colorScheme === 'dark' ? '#171717' : '#fafafa')
                          : colors.mutedForeground,
                      }}>
                        {preset.width} × {preset.height}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Speed Settings */}
          <View>
            <View className="flex-row items-center mb-4 gap-2">
              <Gauge size={20} color={colors.text} />
              <Text className="font-semibold text-base text-zinc-900 dark:text-zinc-100 font-['Inter-SemiBold']">
                Playback Speed
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {SPEED_PRESETS.map((speedPreset) => {
                const isSelected = speed === speedPreset.value;
                return (
                  <TouchableOpacity
                    key={speedPreset.name}
                    onPress={() => handleSpeedChange(speedPreset.value)}
                    className={`
                      rounded-lg border px-4 py-3 min-w-[70px] items-center mb-0
                      ${isSelected ? "bg-blue-500 border-blue-600" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}
                    `}
                    style={isSelected ? { backgroundColor: colors.tint, borderColor: colors.ring } : undefined}
                  >
                    <Text className="font-medium text-sm" style={{
                      color: isSelected 
                        ? (colorScheme === 'dark' ? '#171717' : '#fafafa')
                        : colors.text,
                    }}>
                      {speedPreset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
