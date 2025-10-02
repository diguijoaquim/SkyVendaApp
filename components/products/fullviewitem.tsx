import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export type Product = {
  id: number;
  title: string;
  price: number;
  thumb?: string;
  images?: string;
  description?: string;
  province?: string;
  district?: string;
  time?: string;
  likes?: number;
  liked?: boolean;
  views?: number;
  slug: string;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  };
};

type Props = {
  products: Product[];
};

function formatMZN(value?: number) {
  if (typeof value !== 'number') return '0,00 MZN';
  try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value} MZN`; }
}

export default function FullViewItem({ products }: Props) {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  const [imageIndices, setImageIndices] = useState<{ [key: number]: number }>({});
  const [productLikes, setProductLikes] = useState<{ [key: number]: { liked: boolean; likes: number } }>({});

  const setCurrentImageIndex = (productId: number, index: number) => {
    setImageIndices(prev => ({ ...prev, [productId]: index }));
  };

  const getCurrentImageIndex = (productId: number) => {
    return imageIndices[productId] || 0;
  };

  const toggleLike = useCallback(async (product: Product) => {
    if (!isAuthenticated) {
      Alert.alert('Login Necessário', 'Você precisa fazer login para curtir produtos');
      return;
    }
    
    const currentLikes = productLikes[product.id] || { liked: product.liked || false, likes: product.likes || 0 };
    
    try {
      // Optimistic update
      const newLiked = !currentLikes.liked;
      const newLikes = currentLikes.liked ? currentLikes.likes - 1 : currentLikes.likes + 1;
      
      setProductLikes(prev => ({
        ...prev,
        [product.id]: { liked: newLiked, likes: newLikes }
      }));
      
      // Call API
      await postJson(`/produtos/${product.slug}/like`, {});
    } catch (error) {
      console.log('Error toggling like:', error);
      // Rollback on error
      setProductLikes(prev => ({
        ...prev,
        [product.id]: { liked: currentLikes.liked, likes: currentLikes.likes }
      }));
      Alert.alert('Erro', 'Não foi possível curtir o produto');
    }
  }, [isAuthenticated, productLikes]);

  const renderProduct = (product: Product) => {
    const images = useMemo(() => {
      if (!product) return [] as string[];
      const arr = product.images?.split(',').map(s => s.trim()).filter(Boolean) || [];
      const withThumb = product.thumb ? [product.thumb, ...arr] : arr;
      return withThumb.length ? withThumb : ['https://via.placeholder.com/800x600?text=Produto'];
    }, [product]);

    const currentImageIndex = getCurrentImageIndex(product.id);

    const handleProductPress = () => {
      router.push(`/product/${product.slug}`);
    };

    return (
      <View key={product.id} style={styles.postContainer}>
        {/* Header - User Info */}
        <View style={styles.postHeader}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: product.user?.avatar || 'https://via.placeholder.com/40x40?text=U' }}
              style={styles.avatar}
              
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{product.user?.name || 'Vendedor'}</Text>
              <View style={styles.locationTime}>
                {product.province && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={12} color="#6B7280" />
                    <Text style={styles.locationText}>{product.province}</Text>
                  </View>
                )}
                {product.time && <Text style={styles.timeText}>• {product.time}</Text>}
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Product Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.productPrice}>{formatMZN(product.price)}</Text>
        </View>

        {/* Description */}
        {product.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={3}>
              {product.description}
            </Text>
          </View>
        )}

        {/* Image Gallery */}
        <TouchableOpacity onPress={handleProductPress} activeOpacity={0.95}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: images[currentImageIndex] }}
              style={styles.productImage}
              resizeMode="cover"
            />
            
            {/* Image overlay gradient for better visibility */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
              style={styles.imageOverlay}
              pointerEvents="none"
            />

            {/* Image counter */}
            {images.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1}/{images.length}
                </Text>
              </View>
            )}

            {/* Image navigation dots */}
            {images.length > 1 && (
              <View style={styles.dotsContainer}>
                {images.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentImageIndex(product.id, index)}
                    style={[
                      styles.dot,
                      index === currentImageIndex ? styles.activeDot : styles.inactiveDot
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
              onPress={() => toggleLike(product)}
            >
              <Ionicons 
                name={(productLikes[product.id]?.liked || product.liked) ? 'heart' : 'heart-outline'} 
                size={24} 
                color={(productLikes[product.id]?.liked || product.liked) ? '#EF4444' : '#374151'} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={22} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {productLikes[product.id]?.likes || product.likes || 0} curtidas • {product.views || 0} visualizações
          </Text>
        </View>

        {/* Call to Action */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleProductPress}>
          <Text style={styles.ctaText}>Ver Detalhes</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Debug: log products length
  console.log('FullViewItem: products count =', products.length);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {products.slice(0, 2).map((product, index) => {
        console.log(`Rendering product ${index + 1}:`, product.title);
        return renderProduct(product);
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  postContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  postHeader: {
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
    marginRight: 12,
    borderColor:"pick",
    borderWidth:1
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  locationTime: {
    flexDirection: 'row',
    alignItems: 'center',
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
    padding: 4,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  productPrice: {
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
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 20,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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