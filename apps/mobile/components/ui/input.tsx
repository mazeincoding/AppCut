import React, { useState } from 'react';
import { TextInput, View, TouchableOpacity, TextInputProps, useColorScheme } from 'react-native';

import { Eye, EyeOff } from 'lucide-react-native';

import { Colors } from '@/constants/Colors';

interface InputProps extends TextInputProps {
  showPassword?: boolean;
  onShowPasswordChange?: (show: boolean) => void;
}

export function Input({
  style,
  secureTextEntry,
  showPassword,
  onShowPasswordChange,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [internalShowPassword, setInternalShowPassword] = useState(false);

  const isPassword = secureTextEntry;
  const showPasswordToggle = isPassword && onShowPasswordChange;
  const actualSecureTextEntry = isPassword && !showPassword && !internalShowPassword;

  const handleTogglePassword = () => {
    if (onShowPasswordChange) {
      onShowPasswordChange(!showPassword);
    } else {
      setInternalShowPassword(!internalShowPassword);
    }
  };

  return (
    <View className="relative">
      <TextInput
        className={`
          h-9 border rounded-md px-3 bg-transparent text-base font-['Inter-Regular']
          ${colorScheme === 'dark' ? "border-zinc-800 text-zinc-100" : "border-zinc-200 text-zinc-900"}
          pr-${showPasswordToggle ? "10" : "3"}
        `}
        style={style}
        secureTextEntry={actualSecureTextEntry}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
      {showPasswordToggle && (
        <TouchableOpacity
          onPress={handleTogglePassword}
          className="absolute right-3 top-0 bottom-0 justify-center"
        >
          {showPassword || internalShowPassword ? (
            <Eye size={16} color={colors.mutedForeground} />
          ) : (
            <EyeOff size={16} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
