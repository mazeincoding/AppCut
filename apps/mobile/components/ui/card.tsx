import React from 'react';
import { View, Text, ViewStyle, TextStyle, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface CardTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg"
      style={style}
    >
      <>
        {children}
      </>
    </View>
  );
}

export function CardHeader({ children, style }: CardHeaderProps) {
  return (
    <View className="px-6 pt-6 pb-4" style={style}>
      <>
        {children}
      </>
    </View>
  );
}

export function CardTitle({ children, style }: CardTitleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Text
      className="font-semibold text-xl text-zinc-900 dark:text-zinc-100 mb-1 font-['Inter-SemiBold']"
      style={style}
    >
      <>
        {children}
      </>
    </Text>
  );
}

export function CardDescription({ children, style }: CardDescriptionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <Text
      className="font-normal text-sm text-zinc-500 dark:text-zinc-400"
      style={style}
    >
      <>
        {children}
      </>
    </Text>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View className="px-6 pt-0 pb-6" style={style}>
      <>
        {children}
      </>
    </View>
  );
}
