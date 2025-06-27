import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Plus, Image as ImageIcon, Video, Music, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '@/components/ui/button';

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  uri: string;
  duration?: number;
}

export function MediaPanel() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  const pickMedia = async () => {
    Alert.alert(
      'Add Media',
      'Choose media type to add',
      [
        { text: 'Photo Library', onPress: pickFromLibrary },
        { text: 'Video Library', onPress: pickVideo },
        { text: 'Audio File', onPress: pickAudio },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access media library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newItems = result.assets.map((asset, index) => ({
        id: Date.now() + index + '',
        name: `Media ${Date.now() + index}`,
        type: asset.type === 'video' ? 'video' as const : 'image' as const,
        uri: asset.uri,
        duration: asset.duration != null ? asset.duration : undefined,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['video/*'],
      multiple: true,
    });

    if (!result.canceled) {
      const newItems = result.assets.map((asset, index) => ({
        id: Date.now() + index + '',
        name: asset.name || `Video ${Date.now() + index}`,
        type: 'video' as const,
        uri: asset.uri,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      multiple: true,
    });

    if (!result.canceled) {
      const newItems = result.assets.map((asset, index) => ({
        id: Date.now() + index + '',
        name: asset.name || `Audio ${Date.now() + index}`,
        type: 'audio' as const,
        uri: asset.uri,
      }));
      setMediaItems(prev => [...prev, ...newItems]);
    }
  };

  const removeItem = (id: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== id));
  };

  const filteredItems = mediaItems.filter(item => 
    selectedFilter === 'all' || item.type === selectedFilter
  );

  const renderMediaItem = (item: MediaItem) => (
    <View key={item.id} className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
      <View className="relative">
        {item.type === 'image' ? (
          <Image source={{ uri: item.uri }} className="w-full h-24 bg-gray-200" resizeMode="cover" />
        ) : (
          <View className="w-full h-24 bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            {item.type === 'video' ? (
              <Video size={32} color="#6B7280" />
            ) : (
              <Music size={32} color="#6B7280" />
            )}
          </View>
        )}
        
        <TouchableOpacity
          onPress={() => removeItem(item.id)}
          className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
        >
          <Trash2 size={12} color="white" />
        </TouchableOpacity>
      </View>
      
      <View className="p-2">
        <Text className="text-xs text-gray-700 dark:text-gray-300 truncate" numberOfLines={1}>
          {item.name}
        </Text>
        {item.duration && (
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {Math.floor(item.duration / 60)}:{(item.duration % 60).toFixed(0).padStart(2, '0')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-white dark:bg-gray-800">
      {/* Header */}
      <View className="p-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">Media</Text>
          <Button onPress={pickMedia} variant="outline">
            <Plus size={16} color="#374151" />
            <Text className="ml-1 text-sm">Add</Text>
          </Button>
        </View>
        
        {/* Filter Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2">
          {['all', 'image', 'video', 'audio'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setSelectedFilter(filter as any)}
              className={`px-3 py-1 rounded-full ${
                selectedFilter === filter 
                  ? 'bg-blue-500' 
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Text className={`text-xs ${
                selectedFilter === filter 
                  ? 'text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Media Grid */}
      <ScrollView className="flex-1 p-4">
        {filteredItems.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <ImageIcon size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
              No media in project
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 mt-1 text-center text-sm">
              Tap "Add" to import media files
            </Text>
          </View>
        ) : (
          <View>
            {filteredItems.map(renderMediaItem)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
