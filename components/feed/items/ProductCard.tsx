import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// No need for Dimensions after switching to full-width image style

type ProductData = {
  id: number;
  title: string;
  price: number;
  thumb: string;
  images: string[];
  description: string;
  province: string;
  district: string;
  time: string;
  likes: number;
  liked?: boolean;
  views: string;
  slug: string;
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

type Props = {
  data: ProductData;
};

export default function ProductCard({ data }: Props) {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(data.liked || false);
  const [likes, setLikes] = useState(data.likes || 0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState<boolean>(Boolean(data.user?.is_following));

  const images = (data.images && data.images.length > 0)
    ? data.images
    : (data.thumb ? [data.thumb] : ['https://via.placeholder.com/800x600?text=Produto']);

  const handleProductPress = () => {
    router.push(`/product/${data.slug}`);
  };

  const handleUserPress = () => {
    const username = data?.user?.username;
    if (username) {
      router.push({ pathname: '/(profile)/[username]', params: { username } });
    } else {
      Alert.alert('Perfil', 'Username indisponível para este vendedor.');
    }
  };

  const toggleLike = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Necessário', 'Você precisa fazer login para curtir produtos');
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
      
      // Call API
      await postJson(`/produtos/${data.slug}/like`, {});
    } catch (error) {
      console.log('Error toggling like:', error);
      // Rollback on error
      setLiked(!liked);
      setLikes(liked ? likes + 1 : likes - 1);
      Alert.alert('Erro', 'Não foi possível curtir o produto');
    } finally {
      setLikeBusy(false);
    }
  }, [isAuthenticated, liked, likes, likeBusy, data.slug]);

  const toggleFollowUser = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Necessário', 'Você precisa fazer login para seguir usuários');
      return;
    }
    const prev = following;
    setFollowing(!prev);
    try {
      await postJson(`/usuario/${data.user.id}/seguir`, {});
    } catch (e) {
      setFollowing(prev);
      Alert.alert('Erro', 'Não foi possível atualizar o estado de seguir.');
    }
  }, [isAuthenticated, following, data.user?.id]);

  const formatMZN = (value?: number) => {
    if (typeof value !== 'number') return '0,00 MZN';
    try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value} MZN`; }
  };

  const isOwner = user?.id === data.user?.id;

  const handleEdit = useCallback(() => {
    router.push({ pathname: '/(produtos)/editar/[slug]', params: { slug: data.slug } });
  }, [router, data.slug]);

  const handleBoost = useCallback(() => {
    router.push({ pathname: '/(produtos)/anunciar/[id]', params: { id: String(data.id) } });
  }, [router, data.id]);

  const handleDelete = useCallback(() => {
    Alert.alert('Eliminar produto', 'Tem certeza que deseja eliminar este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => Alert.alert('Eliminar', 'Implementar chamada de API de exclusão.') },
    ]);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const url = `https://skyvenda.com/produto/${data.slug}`;
      await Share.share({ message: `${data.title} - ${url}` });
    } catch {}
  }, [data.slug, data.title]);

  const handleReport = useCallback(() => {
    Alert.alert('Denunciar', 'Obrigado pelo seu feedback. Vamos analisar a sua denúncia.');
  }, []);

  const menuItems = useMemo(() => {
    if (isOwner) {
      return [
        { key: 'edit', label: 'Editar', onPress: handleEdit },
        { key: 'delete', label: 'Eliminar', destructive: true, onPress: handleDelete },
        { key: 'boost', label: 'Turbinar anúncio', onPress: handleBoost },
      ];
    }
    return [
      { key: 'share', label: 'Partilhar', onPress: handleShare },
      { key: 'report', label: 'Denunciar', destructive: true, onPress: handleReport },
    ];
  }, [isOwner, handleEdit, handleDelete, handleBoost, handleShare, handleReport]);

  return (
    <View style={styles.container}>
      {/* Header - User Info */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={handleUserPress}>
          <Image
            source={{ uri: data.user.avatar || 'https://via.placeholder.com/40x40?text=U' }}
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
            <View style={styles.locationRow}>
              {data.province ? (
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={12} color="#6B7280" />
                  <Text style={styles.locationText}>{data.province}</Text>
                </View>
              ) : null}
              {data.time ? <Text style={styles.timeText}>• {data.time}</Text> : null}
            </View>
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleFollowUser} style={{ marginRight: 8 }}>
            <Text style={{ fontSize: 12, color: '#111827', fontWeight: '700' }}>{following ? 'Seguindo' : 'Seguir'}</Text>
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

      {/* Product Title & Price */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.price}>{formatMZN(data.price)}</Text>
      </View>

      {/* Description */}
      {data.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.description} numberOfLines={3}>
            {data.description}
          </Text>
        </View>
      )}

      {/* Image - Single with overlay + counter + dots */}
      <TouchableOpacity onPress={handleProductPress} activeOpacity={0.95}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: images[currentImageIndex] }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)"]}
            style={styles.imageOverlay}
            pointerEvents="none"
          />
          {images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                  style={[
                    styles.dot,
                    index === currentImageIndex ? styles.activeDot : undefined
                  ]}
                />
              ))}
            </View>
          )}
        </View>
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
              name={liked ? 'heart' : 'heart-outline'}
              size={24}
              color={liked ? '#EF4444' : '#374151'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setBookmarked(!bookmarked)}
        >
          <Ionicons
            name={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={bookmarked ? '#7C3AED' : '#374151'}
          />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          {likes} curtidas • {(data.views ?? 0)} visualizações
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaButton} onPress={handleProductPress}>
        <Text style={styles.ctaText}>Ver Detalhes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
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
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  moreButton: {
    padding: 8,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3AED',
  },
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  ctaButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
