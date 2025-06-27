import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, Image, useColorScheme } from 'react-native';

import { X, Image as ImageIcon, Video, Music, Upload, Trash2, Download } from 'lucide-react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'sonner-native';

import { Colors } from '@/constants/Colors';

interface MediaItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio';
  uri: string;
  duration?: number;
  thumbnailUrl?: string;
}

interface MediaModalProps {
  visible: boolean;
  onClose: () => void;
  onAddToTimeline?: (item: MediaItem) => void;
}

export function MediaModal({ visible, onClose, onAddToTimeline }: MediaModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: '1',
      name: 'Sample Video.mp4',
      type: 'video',
      uri: 'sample',
      duration: 30,
    },
    {
      id: '2', 
      name: 'Sample Image.jpg',
      type: 'image',
      uri: 'sample',
    },
    {
      id: '3',
      name: 'Sample Audio.mp3',
      type: 'audio', 
      uri: 'sample',
      duration: 45,
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image' | 'audio'>('all');

  const handlePickFromGallery = async () => {
    try {
      setIsUploading(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All, // TODO: Fix 'MediaTypeOptions' is deprecated
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newItem: MediaItem = {
          id: Date.now().toString(),
          name: asset.fileName || `Media_${Date.now()}`,
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          duration: asset.duration || 0,
          thumbnailUrl: asset.uri,
        };
        setMediaItems([...mediaItems, newItem]);
        toast.success('Media added to library');
      }
    } catch (error) {
      toast.error('Failed to pick media');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      setIsUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*', 'audio/*', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let mediaType: 'video' | 'image' | 'audio' = 'image';
        
        if (asset.mimeType?.startsWith('video')) {
          mediaType = 'video';
        } else if (asset.mimeType?.startsWith('audio')) {
          mediaType = 'audio';
        }

        const newItem: MediaItem = {
          id: Date.now().toString(),
          name: asset.name,
          uri: asset.uri,
          type: mediaType,
          thumbnailUrl: mediaType === 'image' ? asset.uri : undefined,
        };
        setMediaItems([...mediaItems, newItem]);
        toast.success('File imported to library');
      }
    } catch (error) {
      toast.error('Failed to import file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setMediaItems(mediaItems.filter(item => item.id !== id));
    toast.success('Media deleted successfully');
  };

  const handleAddToTimeline = (item: MediaItem) => {
    if (onAddToTimeline) {
      onAddToTimeline(item);
      toast.success(`${item.name} added to timeline`);
      onClose();
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={24} color={colors.text} />;
      case 'audio':
        return <Music size={24} color={colors.text} />;
      default:
        return <ImageIcon size={24} color={colors.text} />;
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const filteredMediaItems = mediaItems.filter((item) => {
    if (mediaFilter !== 'all' && item.type !== mediaFilter) {
      return false;
    }
    return true;
  });

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      {/* Media Preview */}
      <View style={{ height: 120, position: 'relative' }}>
        {item.type === 'image' && item.thumbnailUrl ? (
          <Image 
            source={{ uri: item.thumbnailUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : item.type === 'video' && item.thumbnailUrl ? (
          <View style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image 
              source={{ uri: item.thumbnailUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            <View style={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}>
              <View style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                borderRadius: 20,
                padding: 8,
              }}>
                <Video size={24} color="white" />
              </View>
            </View>
          </View>
        ) : (
          <View style={{
            flex: 1,
            backgroundColor: item.type === 'video' ? '#3b82f6' : 
                            item.type === 'audio' ? '#10b981' : '#8b5cf6',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {getMediaIcon(item.type)}
          </View>
        )}
        
        {/* Duration Badge */}
        {item.duration && (
          <View style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}>
            <Text style={{
              color: 'white',
              fontSize: 10,
              fontFamily: 'Inter-Regular',
            }}>
              {formatDuration(item.duration)}
            </Text>
          </View>
        )}

        {/* Type Badge */}
        <View style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
        }}>
          <Text style={{
            color: 'white',
            fontSize: 10,
            fontFamily: 'Inter-Regular',
            textTransform: 'uppercase',
          }}>
            {item.type}
          </Text>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={() => handleDeleteItem(item.id)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: colors.destructive,
            borderRadius: 12,
            padding: 4,
          }}
        >
          <Trash2 size={12} color={colors.destructiveForeground} />
        </TouchableOpacity>
      </View>

      {/* Media Info */}
      <View style={{ padding: 12 }}>
        <Text style={{
          fontFamily: 'Inter-Medium',
          fontSize: 14,
          color: colors.text,
          fontWeight: '500',
          marginBottom: 8,
        }} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => handleAddToTimeline(item)}
            style={{
              flex: 1,
              backgroundColor: colors.tint,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Download size={14} color={colorScheme === 'dark' ? '#171717' : '#fafafa'} />
            <Text style={{
              fontFamily: 'Inter-Medium',
              fontSize: 12,
              color: colorScheme === 'dark' ? '#171717' : '#fafafa',
              fontWeight: '500'
            }}>
              Add to Timeline
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <Text style={{
            fontFamily: 'Inter-SemiBold',
            fontSize: 18,
            color: colors.text,
            fontWeight: '600'
          }}>
            Media Library
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          {['all', 'video', 'image', 'audio'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setMediaFilter(filter as any)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: mediaFilter === filter ? colors.tint : colors.secondary,
              }}
            >
              <Text style={{
                fontFamily: 'Inter-Medium',
                fontSize: 12,
                color: mediaFilter === filter 
                  ? (colorScheme === 'dark' ? '#171717' : '#fafafa')
                  : colors.secondaryForeground,
                fontWeight: '500',
                textTransform: 'capitalize',
              }}>
                {filter === 'all' ? 'All Media' : filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload Buttons */}
        <View style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          <TouchableOpacity
            onPress={handlePickFromGallery}
            disabled={isUploading}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              backgroundColor: colors.secondary,
              borderRadius: 6,
            }}
          >
            {isUploading ? (
              <Upload size={20} color={colors.secondaryForeground} />
            ) : (
              <ImageIcon size={20} color={colors.secondaryForeground} />
            )}
            <Text style={{
              fontFamily: 'Inter-Medium',
              fontSize: 14,
              color: colors.secondaryForeground,
              fontWeight: '500'
            }}>
              {isUploading ? 'Uploading...' : 'Gallery'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePickDocument}
            disabled={isUploading}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              backgroundColor: colors.secondary,
              borderRadius: 6,
            }}
          >
            <Upload size={20} color={colors.secondaryForeground} />
            <Text style={{
              fontFamily: 'Inter-Medium',
              fontSize: 14,
              color: colors.secondaryForeground,
              fontWeight: '500'
            }}>
              Import File
            </Text>
          </TouchableOpacity>
        </View>

        {/* Media List */}
        <FlatList
          data={filteredMediaItems}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center',
              paddingVertical: 64,
            }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <ImageIcon size={24} color={colors.mutedForeground} />
              </View>
              <Text style={{
                fontFamily: 'Inter-Regular',
                fontSize: 16,
                color: colors.mutedForeground,
                textAlign: 'center'
              }}>
                {mediaFilter === 'all' ? 'No media found' : `No ${mediaFilter} files found`}
              </Text>
              <Text style={{
                fontFamily: 'Inter-Regular',
                fontSize: 14,
                color: colors.mutedForeground,
                textAlign: 'center',
                marginTop: 8,
              }}>
                Use the buttons above to add media
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
