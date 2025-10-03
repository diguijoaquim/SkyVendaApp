import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useHome } from '@/contexts';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
    username?: string;
    avatar: string | null;
    tipo?: 'loja' | 'nhonguista' | 'cliente' | string;
    conta_pro?: boolean;
    is_following?: boolean;
  };
};

type Props = { data: PostData };

export default function PostCard({ data }: Props) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { upsertPostDetailById } = useHome() as any;
  const [liked, setLiked] = useState(data.liked || false);
  const [likes, setLikes] = useState(data.likes || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState<boolean>(Boolean(data.user?.is_following));

  const handleUserPress = () => {
    const username = data?.user?.username || undefined;
    if (username) {
      router.push({ pathname: '/(profile)/[username]', params: { username } });
    } else {
      Alert.alert('Perfil', 'Perfil do autor indisponível no momento.');
    }
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
      await postJson(`/publicacoes/${data.id}/like`, {});
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

  const toggleFollowUser = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Necessário', 'Você precisa fazer login para seguir usuários');
      return;
    }
    // Optimistic update
    const prev = following;
    setFollowing(!prev);
    try {
      await postJson(`/usuario/${data.user.id}/seguir`, {});
    } catch (e) {
      // rollback
      setFollowing(prev);
      Alert.alert('Erro', 'Não foi possível atualizar o estado de seguir.');
    }
  }, [isAuthenticated, following, data.user?.id]);

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

  const openDetails = useCallback(() => {
    // Pre-populate HomeContext post cache so detail screen doesn't need to refetch
    const cachedShape = {
      id: data.id,
      conteudo: data.content,
      gradient_style: data.gradient_style,
      data_criacao: data.time,
      usuario: {
        id: data.user?.id,
        nome: data.user?.name,
        username: data.user?.username,
        foto_perfil: data.user?.avatar || null,
      },
      deu_like: Boolean(data.liked),
      likes: Number(data.likes || 0),
      comentarios: [],
    };
    upsertPostDetailById?.(cachedShape);
    router.push({ pathname: '/post', params: { id: String(data.id) } });
  }, [router, data.id, data.content, data.gradient_style, data.time, data.user, data.liked, data.likes, upsertPostDetailById]);

  const isOwner = user?.id === data.user?.id;

  const handleEdit = useCallback(() => {
    router.push({ pathname: '/posts/editar/[id]', params: { id: String(data.id) } });
  }, [router, data.id]);

  const handleDelete = useCallback(() => {
    Alert.alert('Eliminar publicação', 'Tem certeza que deseja eliminar esta publicação?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => Alert.alert('Eliminar', 'Implementar chamada de API de exclusão.') },
    ]);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const url = `https://skyvenda.com/post/${data.id}`;
      await Share.share({ message: `${data.content} - ${url}` });
    } catch {}
  }, [data.id, data.content]);

  const handleReport = useCallback(() => {
    Alert.alert('Denunciar', 'Obrigado pelo seu feedback. Vamos analisar a sua denúncia.');
  }, []);

  const menuItems = useMemo(() => {
    if (isOwner) {
      return [
        { key: 'edit', label: 'Editar', onPress: handleEdit },
        { key: 'delete', label: 'Eliminar', destructive: true, onPress: handleDelete },
      ];
    }
    return [
      { key: 'share', label: 'Partilhar', onPress: handleShare },
      { key: 'report', label: 'Denunciar', destructive: true, onPress: handleReport },
    ];
  }, [isOwner, handleEdit, handleDelete, handleShare, handleReport]);

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
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={styles.username}>{data.user.name}</Text>
              {data.user?.tipo === 'loja' && (
                <MaterialIcons name="storefront" size={14} color="#6B7280" style={{ marginLeft: 6 }} />
              )}
              {!!data.user?.conta_pro && (
                <Text style={{ marginLeft: 6, fontSize: 10, color: '#0EA5E9', fontWeight: '700' }}>PRO</Text>
              )}
              {!!data.user?.tipo && (
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    color: '#4338CA',
                    backgroundColor: '#EEF2FF',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    textTransform: 'capitalize'
                  }}
                >
                  {data.user.tipo}
                </Text>
              )}
            </View>
            <Text style={styles.time}>{data.time}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleFollowUser} style={{ marginRight: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: '#111827',
                fontWeight: '700'
              }}
            >
              {following ? 'Seguindo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <View style={styles.moreButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
              </View>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuItems.map((it) => (
                <DropdownMenuItem key={it.key} destructive={it.destructive} onSelect={it.onPress}>
                  {it.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
      </View>

      {/* Post Content */}
      <TouchableOpacity activeOpacity={0.8} onPress={openDetails}>
        <LinearGradient
          colors={getGradientColors(data.gradient_style) as any}
          style={styles.postContent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.contentText}>{data.content}</Text>
        </LinearGradient>
      </TouchableOpacity>

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
          <Text style={styles.likesText}>{likes}</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={openDetails}>
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
  likesText: {
    marginRight: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});
