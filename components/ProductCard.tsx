import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export type Produto = {
  id: number;
  // Web shape
  title?: string;
  price?: number;
  thumb?: string;
  slug?: string;
  // Legacy shape
  nome?: string;
  preco?: number;
  imagem?: string;
  descricao?: string;
};

type Props = {
  product: Produto;
  onPress?: (product: Produto) => void;
};

export default function ProductCard({ product, onPress }: Props) {
  const displayTitle = product.title ?? product.nome ?? '';
  const displayPrice = (product.price ?? product.preco ?? 0);
  const displayImage = product.thumb ?? product.imagem ?? 'https://via.placeholder.com/300x200?text=Produto';
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(product)}>
      <Image source={{ uri: displayImage }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{displayTitle}</Text>
        <Text style={styles.cardPrice}>MT {formatPrice(displayPrice)}</Text>
        {product.descricao ? <Text style={styles.cardDesc} numberOfLines={2}>{product.descricao}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function formatPrice(v: number) {
  try {
    return new Intl.NumberFormat('pt-MZ', { style: 'decimal', minimumFractionDigits: 2 }).format(v);
  } catch {
    return String(v);
  }
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  cardImage: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardPrice: { marginTop: 4, color: '#10B981', fontWeight: '700' },
  cardDesc: { marginTop: 6, color: '#6B7280', fontSize: 12 },
});
