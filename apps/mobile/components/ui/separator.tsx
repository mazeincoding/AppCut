import React from 'react';
import { View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: any;
}

export function Separator({ orientation = 'horizontal', style }: SeparatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      className={
        orientation === 'horizontal'
          ? "h-px w-full"
          : "w-px h-full"
      }
      style={[
        { backgroundColor: colors.border },
        style,
      ]}
    />
  );
}
