import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FriendData = {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  cover: string | null;
  is_pro: boolean;
  time_joined: string;
};

type Props = {
  data: FriendData;
};

export default function FriendSuggestionCard({ data }: Props) {
  const [following, setFollowing] = useState(false);

  const handleUserPress = () => {
    console.log('User pressed:', data.id);
    // router.push(`/profile/${data.id}`);
  };

  const handleFollowPress = () => {
    setFollowing(!following);
    // TODO: Implement follow/unfollow API call
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.suggestionLabel}>
          <Ionicons name="people-outline" size={12} color="#6B7280" />
          <Text style={styles.suggestionText}>Sugestão para você</Text>
        </View>
        <TouchableOpacity style={styles.closeButton}>
          <Ionicons name="close" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleUserPress} activeOpacity={0.9}>
        {/* Cover Image */}
        {data.cover && (
          <Image source={{ uri: data.cover }} style={styles.coverImage} />
        )}

        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: data.avatar || 'https://via.placeholder.com/60x60?text=U' 
              }}
              style={styles.avatar}
            />
            {data.is_pro && (
              <View style={styles.proBadge}>
                <Ionicons name="star" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.username}>@{data.username}</Text>
          <Text style={styles.joinedTime}>Entrou {data.time_joined}</Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.followButton, following && styles.followingButton]}
          onPress={handleFollowPress}
        >
          <Text style={[styles.followText, following && styles.followingText]}>
            {following ? 'Seguindo' : 'Seguir'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.messageButton} onPress={handleUserPress}>
          <Ionicons name="chatbubble-outline" size={16} color="#7C3AED" />
          <Text style={styles.messageText}>Mensagem</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  coverImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  userInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  proBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  joinedTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#E5E7EB',
  },
  followText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingText: {
    color: '#6B7280',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  messageText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});
