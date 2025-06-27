import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'text' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  children,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      opacity: disabled ? 0.5 : 1,
    };

    // Size styles
    switch (size) {
      case 'sm':
        baseStyle.height = 32;
        baseStyle.paddingHorizontal = 12;
        break;
      case 'lg':
        baseStyle.height = 40;
        baseStyle.paddingHorizontal = 32;
        break;
      case 'icon':
        baseStyle.height = 28;
        baseStyle.width = 28;
        baseStyle.paddingHorizontal = 0;
        break;
      default:
        baseStyle.height = 36;
        baseStyle.paddingHorizontal = 16;
    }

    // Variant styles - matching Next.js exactly
    switch (variant) {
      case 'destructive':
        baseStyle.backgroundColor = colors.destructive;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.border;
        break;
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'text':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.paddingHorizontal = 0;
        break;
      case 'link':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.paddingHorizontal = 0;
        break;
      default:
        // Primary button - black in light mode, white in dark mode
        baseStyle.backgroundColor = colors.tint;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: 'Inter-Medium',
      fontSize: size === 'sm' ? 12 : 14,
      fontWeight: '500',
    };

    switch (variant) {
      case 'destructive':
        baseStyle.color = colors.destructiveForeground;
        break;
      case 'outline':
        baseStyle.color = colors.text;
        break;
      case 'secondary':
        baseStyle.color = colors.secondaryForeground;
        break;
      case 'text':
        baseStyle.color = colors.text;
        baseStyle.fontWeight = '400';
        break;
      case 'link':
        baseStyle.color = colors.tint;
        baseStyle.textDecorationLine = 'underline';
        break;
      default:
        // Primary button text - white in light mode, black in dark mode
        baseStyle.color = colorScheme === 'dark' ? '#171717' : '#fafafa';
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextStyle().color} />
      ) : (
        <>
          {icon && <>{icon}</>}
          {children ? (
            <>{children}</>
          ) : (
            title && (
              <Text style={[getTextStyle(), textStyle, ...(icon ? [{ marginLeft: 8 }] : [])]}>
                {title}
              </Text>
            )
          )}
        </>
      )}
    </TouchableOpacity>
  );
}
