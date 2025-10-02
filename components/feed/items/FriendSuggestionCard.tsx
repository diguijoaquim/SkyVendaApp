import { followUser, unfollowUser } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FriendSuggestion {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  cover: string | null;
  is_pro: boolean;
  time_joined: string;
  following: boolean;
  followers: number;
}

interface FriendSuggestionCardProps {
  friend: FriendSuggestion;
  onFollow?: (friendId: number) => void;
  onViewProfile?: (friendId: number) => void;
}

export default function FriendSuggestionCard({ 
  friend, 
  onFollow, 
  onViewProfile 
}: FriendSuggestionCardProps) {
  const [isFollowing, setIsFollowing] = useState(friend.following);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      if (isFollowing) {
        await unfollowUser(friend.id);
        setIsFollowing(false);
        Alert.alert('Sucesso', `Você deixou de seguir ${friend.name}`);
      } else {
        await followUser(friend.id);
        setIsFollowing(true);
        Alert.alert('Sucesso', `Você começou a seguir ${friend.name}`);
      }
      
      if (onFollow) {
        onFollow(friend.id);
      }
    } catch (error: any) {
      console.error('Erro ao seguir/deixar de seguir:', error);
      Alert.alert(
        'Erro', 
        error?.response?.data?.detail || 'Não foi possível seguir este usuário'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(friend.id);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleViewProfile} style={styles.profileContainer}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: friend.avatar || 'https://via.placeholder.com/60x60?text=U'
            }}
            style={styles.avatar}
          />
          {friend.is_pro && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {friend.name}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{friend.username}
          </Text>
          <Text style={styles.timeJoined}>
            Membro há {friend.time_joined}
          </Text>
          <Text style={styles.followersCount}>
            {friend.followers} seguidor{friend.followers !== 1 ? 'es' : ''}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[
          styles.followButton,
          isFollowing && styles.followingButton
        ]}
        onPress={handleFollow}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : (
          <>
            <Ionicons 
              name={isFollowing ? "checkmark" : "person-add"} 
              size={16} 
              color={isFollowing ? "#10B981" : "#8B5CF6"} 
            />
            <Text style={[
              styles.followText,
              isFollowing && styles.followingText
            ]}>
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
  },
  proBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeJoined: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  followersCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  followText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 4,
  },
  followingButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  followingText: {
    color: '#10B981',
  },
});