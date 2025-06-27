import React, { useState } from 'react';

import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useColorScheme
} from 'react-native';

import { Link, useRouter } from 'expo-router';

import { Eye, EyeOff } from 'lucide-react-native';

import { authClient } from '@/lib/auth';
import { Header } from '@/components/ui/header';

export default function SignUpPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  const validateForm = () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setError(null);
    setIsEmailLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (error) {
        setError(error.message || 'An unexpected error occurred.');
        return;
      }

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ]);
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await authClient.signIn.social({
        provider: 'google',
      });
      router.push('/');
    } catch (error) {
      setError('Failed to sign up with Google. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View className={isDark ? "flex-1 bg-black" : "flex-1 bg-white"}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={isDark ? '#000000' : '#ffffff'} 
      />
      
      <Header showBackButton />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center px-6">
            <View className={`
              ${isDark ? "bg-[#0a0a0a] border-[#27272a]" : "bg-white border-[#e4e4e7]"}
              rounded-xl p-6 border shadow-lg
            `} style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}>
              {/* Error Alert */}
              {error && (
                <View className={`
                  ${isDark ? "bg-[#7f1d1d] border-[#dc2626]" : "bg-[#fef2f2] border-[#fecaca]"}
                  border rounded-md p-4 mb-6
                `}>
                  <Text className={isDark ? "text-base font-semibold text-gray-50 mb-1" : "text-base font-semibold text-gray-900 mb-1"}>
                    Error
                  </Text>
                  <Text className={isDark ? "text-sm text-gray-400 leading-5" : "text-sm text-gray-500 leading-5"}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Title */}
              <View className="items-center mb-6">
                <Text className={isDark ? "text-2xl font-semibold text-gray-50 mb-2" : "text-2xl font-semibold text-gray-900 mb-2"}>
                  Create your account
                </Text>
                <Text className={isDark ? "text-base text-gray-400 text-center leading-6" : "text-base text-gray-500 text-center leading-6"}>
                  Get started with your free account today
                </Text>
              </View>

              {/* Google Button */}
              <TouchableOpacity 
                onPress={handleGoogleSignUp}
                disabled={isAnyLoading}
                className={`
                  h-11 bg-transparent border rounded-md flex-row items-center justify-center mb-6
                  ${isDark ? "border-[#27272a]" : "border-[#e4e4e7]"}
                  ${isAnyLoading ? "opacity-50" : ""}
                `}
              >
                <Text className={isDark ? "text-base font-medium text-gray-50" : "text-base font-medium text-gray-900"}>
                  {isGoogleLoading ? 'Signing up...' : 'Continue with Google'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View className="relative mb-6">
                <View className={isDark ? "h-px bg-[#27272a]" : "h-px bg-[#e4e4e7]"} />
                <View className="absolute -top-2 left-0 right-0 items-center">
                  <Text className={`
                    text-xs uppercase
                    ${isDark ? "text-gray-500 bg-[#0a0a0a]" : "text-gray-400 bg-white"}
                    px-2
                  `}>
                    Or continue with
                  </Text>
                </View>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                {/* Name Input */}
                <View>
                  <Text className={isDark ? "text-sm font-medium text-gray-50 mb-2" : "text-sm font-medium text-gray-900 mb-2"}>
                    Full Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
                    autoCapitalize="words"
                    className={`
                      h-11 border rounded-md px-3 bg-transparent text-base
                      ${isDark ? "border-[#27272a] text-gray-50" : "border-[#e4e4e7] text-gray-900"}
                    `}
                  />
                </View>

                {/* Email Input */}
                <View>
                  <Text className={isDark ? "text-sm font-medium text-gray-50 mb-2" : "text-sm font-medium text-gray-900 mb-2"}>
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="m@example.com"
                    placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className={`
                      h-11 border rounded-md px-3 bg-transparent text-base
                      ${isDark ? "border-[#27272a] text-gray-50" : "border-[#e4e4e7] text-gray-900"}
                    `}
                  />
                </View>

                {/* Password Input */}
                <View>
                  <Text className={isDark ? "text-sm font-medium text-gray-50 mb-2" : "text-sm font-medium text-gray-900 mb-2"}>
                    Password
                  </Text>
                  <View className="relative">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Create a strong password"
                      placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
                      secureTextEntry={!showPassword}
                      className={`
                        h-11 border rounded-md px-3 pr-12 bg-transparent text-base
                        ${isDark ? "border-[#27272a] text-gray-50" : "border-[#e4e4e7] text-gray-900"}
                      `}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 w-5 h-5"
                    >
                      {showPassword ? (
                        <Eye size={20} color={isDark ? '#71717a' : '#a1a1aa'} />
                      ) : (
                        <EyeOff size={20} color={isDark ? '#71717a' : '#a1a1aa'} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Create Account Button */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={isEmailLoading}
                  className={`
                    h-11 bg-gray-50 rounded-md items-center justify-center
                    ${isEmailLoading ? "opacity-50" : ""}
                  `}
                >
                  <Text className="text-base font-medium text-gray-900">
                    {isEmailLoading ? 'Creating account...' : 'Create account'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Link */}
              <View className="flex-row justify-center mt-6">
                <Text className={isDark ? "text-sm text-gray-500" : "text-sm text-gray-400"}>
                  Already have an account?{' '}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text className={isDark ? "text-sm text-gray-50 font-medium underline" : "text-sm text-gray-900 font-medium underline"}>
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
