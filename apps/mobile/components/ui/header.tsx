import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';

import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import LogoSVG from '../logo';

interface HeaderProps {
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export function Header({ showBackButton = false, onBackPress }: HeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView edges={['top']} className="bg-transparent">
      <View
        className="flex-row items-center justify-between px-4 py-3 mx-4 mt-2 bg-[rgba(29,29,29,0.9)] rounded-2xl border border-white/10 min-h-[56px]"
      >
        {showBackButton ? (
          <TouchableOpacity 
            onPress={handleBackPress}
            className="w-8 h-8 items-center justify-center"
          >
            <ArrowLeft size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="w-8 h-8" />
        )}

        {/* Logo */}
        <TouchableOpacity 
          onPress={() => router.push('/')}
          className="flex-row items-center gap-3"
        >
         <LogoSVG />
          <Text className="text-white text-lg font-medium font-['Inter-Medium']">
            OpenCut
          </Text>
        </TouchableOpacity>

        <View className="w-8 h-8" />
      </View>
    </SafeAreaView>
  );
}
