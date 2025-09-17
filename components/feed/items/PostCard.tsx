import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type PostData = {
  id: number;
  content: string;
  gradient_style: string;
  time: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
};

type Props = {
  data: PostData;
};

export default function PostCard({ data }: Props) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleUserPress = () => {
    console.log('User pressed:', data.user.id);
    // router.push(`/profile/${data.user.id}`);
  };

  const getGradientColors = (style: string): [string, string] => {
    const gradients: { [key: string]: [string, string] } = {
      'purple': ['#8B5CF6', '#A855F7'],
      'blue': ['#3B82F6', '#1D4ED8'],
      'green': ['#10B981', '#059669'],
      'pink': ['#EC4899', '#BE185D'],
      'orange': ['#F59E0B', '#D97706'],
      'red': ['#EF4444', '#DC2626'],
      'default': ['#6B7280', '#4B5563']
    };
    return gradients[style] || gradients['default'];
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          <Image
            source={{ 
              uri: data.user.avatar || 'https://via.placeholder.com/40x40?text=U' 
            }}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>{data.user.name}</Text>
            <Text style={styles.time}>{data.time}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Post Content */}
      <LinearGradient
        colors={getGradientColors(data.gradient_style)}
        style={styles.postContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.contentText}>{data.content}</Text>
      </LinearGradient>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setLiked(!liked)}
          >
            <Ionicons 
              name={liked ? "heart" : "heart-outline"} 
              size={24} 
              color={liked ? "#EF4444" : "#374151"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#374151" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setBookmarked(!bookmarked)}
        >
          <Ionicons 
            name={bookmarked ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={bookmarked ? "#7C3AED" : "#374151"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  postContent: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
});
