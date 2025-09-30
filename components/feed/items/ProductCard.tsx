import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  views: string;
  slug: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
};

type Props = {
  data: ProductData;
};

export default function ProductCard({ data }: Props) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const images = (data.images && data.images.length > 0)
    ? data.images
    : (data.thumb ? [data.thumb] : ['https://via.placeholder.com/800x600?text=Produto']);

  const handleProductPress = () => {
    router.push(`/product/${data.slug}`);
  };

  const handleUserPress = () => {
    console.log('User pressed:', data.user.id);
    // router.push(`/profile/${data.user.id}`);
  };

  const formatMZN = (value?: number) => {
    if (typeof value !== 'number') return '0,00 MZN';
    try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value} MZN`; }
  };

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
            <Text style={styles.username}>{data.user.name}</Text>
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
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
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
            onPress={() => setLiked(!liked)}
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
          {(data.likes ?? 0)} curtidas • {(data.views ?? 0)} visualizações
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
