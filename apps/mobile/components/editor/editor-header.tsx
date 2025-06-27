import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { ChevronLeft, Download } from 'lucide-react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export function EditorHeader() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export project');
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 56,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      {/* Left Content */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Link href="/" asChild>
          <TouchableOpacity style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
          }}>
            <ChevronLeft size={16} color={colors.text} />
          </TouchableOpacity>
        </Link>
        <Text style={{
          fontFamily: 'Inter-Medium',
          fontSize: 16,
          color: colors.text,
          fontWeight: '500'
        }}>
          Untitled Project
        </Text>
      </View>

      {/* Center Content */}
      <Text style={{
        fontFamily: 'Inter-Regular',
        fontSize: 12,
        color: colors.mutedForeground,
        textAlign: 'center'
      }}>
        {/* TODO: Put any additional information here, like project status or last saved time */}
      </Text>

      {/* Right Content */}
      <TouchableOpacity
        onPress={handleExport}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.tint,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 6,
        }}
      >
        <Download size={16} color={colorScheme === 'dark' ? '#171717' : '#fafafa'} />
        <Text style={{
          fontFamily: 'Inter-Medium',
          fontSize: 14,
          color: colorScheme === 'dark' ? '#171717' : '#fafafa',
          fontWeight: '500'
        }}>
          Export
        </Text>
      </TouchableOpacity>
    </View>
  );
}
