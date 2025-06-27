import { Text, View, TouchableOpacity, StatusBar, ImageBackground, useColorScheme } from "react-native";
import { useEffect } from 'react';

import { Link } from "expo-router";

import { ArrowRight } from "lucide-react-native";

import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay
} from 'react-native-reanimated';

import { Header } from '@/components/ui/header';
import { Colors } from '@/constants/Colors';

export default function App() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate elements in sequence
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 800 }));
    titleTranslateY.value = withDelay(200, withTiming(0, { duration: 800 }));
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    buttonsOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
    footerOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const footerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  return (
    <ImageBackground 
      source={require('../assets/images/landing-page-bg.png')} 
      className="flex-1"
      resizeMode="cover"
    >
      <View className="flex-1 bg-black/50">
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Header with Logo */}
        <Header />
        
        <View className="flex-1 justify-between items-center px-6 pb-8">
          {/* Main Content */}
          <View className="flex-1 justify-center items-center max-w-[768px] w-full">
            {/* Title Section */}
            <Animated.View 
              style={[titleAnimatedStyle]}
              className="items-center mb-10"
            >
              <Text className="text-white text-4xl font-bold text-center leading-[44px] font-['Inter-Bold']">
                The Open Source
              </Text>
              
              {/* Framed "Video Editor" text */}
              <View className="mt-4 relative">
                <View 
                  className="border-2 border-white rounded-lg px-6 py-3"
                  style={{ transform: [{ rotate: '-2.76deg' }] }}
                >
                  <Text className="text-white text-4xl font-bold font-['Inter-Bold']">
                    Video Editor
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View style={subtitleAnimatedStyle} className="mb-12">
              <Text className="text-gray-300 text-lg text-center leading-7 max-w-[512px] font-light font-['Inter-Regular']">
                A simple but powerful video editor that gets the job done. Works on any platform.
              </Text>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View style={buttonsAnimatedStyle} className="w-full space-y-4">
              <Link href="/editor" asChild>
                <TouchableOpacity className="bg-white rounded-lg p-4 flex-row items-center justify-center mb-4">
                  <Text className="text-black font-semibold text-lg mr-2 font-['Inter-SemiBold']">
                    Open Editor
                  </Text>
                  <ArrowRight size={20} color="black" />
                </TouchableOpacity>
              </Link>

              <Link href="/(auth)/login" asChild>
                <TouchableOpacity className="border border-gray-400 rounded-lg p-4 flex-row items-center justify-center">
                  <Text className="text-white font-semibold text-lg font-['Inter-SemiBold']">
                    Sign In
                  </Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </View>

          {/* Footer */}
          <Animated.View 
            style={footerAnimatedStyle}
            className="mb-8"
          >
            <Text className="text-gray-400 text-sm text-center font-['Inter-Regular']">
              Currently in beta • Open source on{" "}
              <Text className="text-white underline">GitHub</Text>
            </Text>
          </Animated.View>
        </View>
      </View>
    </ImageBackground>
  );
}
