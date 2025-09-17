import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AdData = {
  id: number;
  title: string;
  description: string;
  image: string | null;
  product_name: string | null;
  price: number | null;
  type_ad: string;
  expires_at: string;
};

type Props = {
  data: AdData;
};

export default function AdCard({ data }: Props) {

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-MZ', {
      style: 'currency',
      currency: 'MZN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAdPress = () => {
    // Navigate to ad details or product
    console.log('Ad pressed:', data.id);
  };

  return (
    <View style={styles.container}>
      {/* Sponsored Label */}
      <View style={styles.sponsoredLabel}>
        <Ionicons name="megaphone-outline" size={12} color="#6B7280" />
        <Text style={styles.sponsoredText}>Patrocinado</Text>
      </View>

      <TouchableOpacity onPress={handleAdPress} activeOpacity={0.9}>
        {/* Ad Image */}
        {data.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: data.image }} style={styles.adImage} />
            
            {/* Overlay with title */}
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>{data.title}</Text>
            </View>
          </View>
        )}

        {/* Ad Content */}
        <View style={styles.content}>
          {!data.image && (
            <Text style={styles.title}>{data.title}</Text>
          )}
          
          {data.product_name && (
            <Text style={styles.productName}>{data.product_name}</Text>
          )}
          
          {data.price && (
            <Text style={styles.price}>{formatPrice(data.price)}</Text>
          )}
          
          <Text style={styles.description} numberOfLines={2}>
            {data.description}
          </Text>

          {/* CTA Button */}
          <TouchableOpacity style={styles.ctaButton}>
            <Text style={styles.ctaText}>Saiba Mais</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
  sponsoredLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sponsoredText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  adImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3AED',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
});
