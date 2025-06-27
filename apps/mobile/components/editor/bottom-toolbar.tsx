import React from 'react';

import { View, TouchableOpacity, Text, ScrollView, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

import {
  Image,
  Settings,
  Scissors,
  ArrowLeftToLine,
  ArrowRightToLine,
  SplitSquareHorizontal,
  Copy,
  Snowflake,
  Trash2
} from 'lucide-react-native';

import { toast } from 'sonner-native';

interface BottomToolbarProps {
  onMediaPress: () => void;
  onToolsPress: () => void;
  isPlaying: boolean;
  isMuted: boolean;
  onPlayPause: () => void;
  onMuteToggle: () => void;
}

export function BottomToolbar({
  onMediaPress,
  onToolsPress,
  isPlaying,
  isMuted,
  onPlayPause,
  onMuteToggle
}: BottomToolbarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSplitClip = () => {
    toast('Split Clip - Coming Soon');
  };

  const handleSplitKeepLeft = () => {
    toast('Split and Keep Left - Coming Soon');
  };

  const handleSplitKeepRight = () => {
    toast('Split and Keep Right - Coming Soon');
  };

  const handleSeparateAudio = () => {
    toast('Separate Audio - Coming Soon');
  };

  const handleDuplicateClip = () => {
    toast('Duplicate Clip - Coming Soon');
  };

  const handleFreezeClip = () => {
    toast('Freeze Clip - Coming Soon');
  };

  const handleDeleteClip = () => {
    toast('Delete Clip - Coming Soon');
  };

  const ToolButton = ({
    icon: Icon,
    label,
    onPress
  }: {
    icon: any;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 70,
      }}
    >
      <View style={{
        backgroundColor: colors.secondary,
        borderRadius: 6,
        padding: 10,
        marginBottom: 3,
      }}>
        <Icon size={18} color={colors.secondaryForeground} />
      </View>
      <Text style={{
        fontFamily: 'Inter-Regular',
        fontSize: 9,
        color: colors.text,
        textAlign: 'center',
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 8,
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 6,
        }}
      >
        {/* Media & Settings Section */}
        <ToolButton
          icon={Image}
          label="Media"
          onPress={onMediaPress}
        />

        <ToolButton
          icon={Settings}
          label="Settings"
          onPress={onToolsPress}
        />

        {/* Separator */}
        <View style={{
          width: 1,
          height: 50,
          backgroundColor: colors.border,
          marginHorizontal: 6,
          alignSelf: 'center',
        }} />

        {/* Editing Tools Section */}
        <ToolButton
          icon={Scissors}
          label="Split Clip"
          onPress={handleSplitClip}
        />

        <ToolButton
          icon={ArrowLeftToLine}
          label="Keep Left"
          onPress={handleSplitKeepLeft}
        />

        <ToolButton
          icon={ArrowRightToLine}
          label="Keep Right"
          onPress={handleSplitKeepRight}
        />

        <ToolButton
          icon={SplitSquareHorizontal}
          label="Separate Audio"
          onPress={handleSeparateAudio}
        />

        <ToolButton
          icon={Copy}
          label="Duplicate"
          onPress={handleDuplicateClip}
        />

        <ToolButton
          icon={Snowflake}
          label="Freeze"
          onPress={handleFreezeClip}
        />

        <ToolButton
          icon={Trash2}
          label="Delete"
          onPress={handleDeleteClip}
        />
      </ScrollView>
    </View>
  );
}
