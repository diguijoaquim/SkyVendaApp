import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type PostData = {
  id: number;
  content: string;
  gradient_style: string;
  time: string;
  likes?: number;
  liked?: boolean;
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
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(data.liked || false);
  const [likes, setLikes] = useState(data.likes || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleUserPress = () => {
    console.log('User pressed:', data.user.id);
    // router.push(`/profile/${data.user.id}`);
  };

  const toggleLike = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Necessário', 'Você precisa fazer login para curtir posts');
      return;
    }
    
    if (likeBusy) return;
    
    try {
      setLikeBusy(true);
      // Optimistic update
      const newLiked = !liked;
      const newLikes = liked ? likes - 1 : likes + 1;
      
      setLiked(newLiked);
      setLikes(newLikes);
      
      // Call API (assuming there's a posts like endpoint)
      await postJson(`/posts/${data.id}/like`, {});
    } catch (error) {
      console.log('Error toggling like:', error);
      // Rollback on error
      setLiked(!liked);
      setLikes(liked ? likes + 1 : likes - 1);
      Alert.alert('Erro', 'Não foi possível curtir o post');
    } finally {
      setLikeBusy(false);
    }
  }, [isAuthenticated, liked, likes, likeBusy, data.id]);

  const getGradientColors = (style: string): string[] => {
    // Converte gradientes Tailwind para cores hex
    const gradients: { [key: string]: string[] } = {
      // Gradientes da web convertidos para hex (3 cores: from, via, to)
      'bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600': ['#DB2777', '#9333EA', '#2563EB'],
      'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500': ['#10B981', '#14B8A6', '#3B82F6'],
      'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500': ['#F97316', '#EF4444', '#EC4899'],
      'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500': ['#3B82F6', '#06B6D4', '#14B8A6'],
      'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500': ['#A855F7', '#EC4899', '#EF4444'],
      
      // Fallbacks para estilos antigos (2 cores)
      'purple': ['#8B5CF6', '#A855F7'],
      'blue': ['#3B82F6', '#1D4ED8'],
      'green': ['#10B981', '#059669'],
      'pink': ['#EC4899', '#BE185D'],
      'orange': ['#F59E0B', '#D97706'],
      'red': ['#EF4444', '#DC2626'],
      'default': ['#6B7280', '#4B5563']
    };
    
    // Se for um gradiente Tailwind completo, retorna as cores
    if (gradients[style]) {
      return gradients[style];
    }
    
    // Fallback para gradiente padrão
    return gradients['default'];
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
        colors={getGradientColors(data.gradient_style) as any}
        style={styles.postContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.contentText}>{data.content}</Text>
      </LinearGradient>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={toggleLike}
            disabled={likeBusy}
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
    marginBottom: 0, // Remove margin bottom for full width
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 0, // Remove horizontal padding for full width
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16, // Add padding only to header
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
    borderRadius: 0, // Remove border radius for full width
    padding: 24,
    marginBottom: 16,
    minHeight: 250,
    maxHeight: 320,
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
    paddingHorizontal: 16, // Add padding only to action bar
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
