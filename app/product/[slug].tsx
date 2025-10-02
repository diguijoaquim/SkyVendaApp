import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/contexts/HomeContext';
import { postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export type ProdutoDetalhe = {
  id: number;
  slug: string;
  title: string;
  price: number;
  thumb?: string;
  images?: string | string[]; // CSV ou array
  province?: string;
  time?: string;
  description?: string;
  details?: string; // HTML (ignored here)
  state?: string;
  likes?: number;
  liked?: boolean;
  comments?: Array<{ id: number; text: string; date?: string; user?: { id?: number; name?: string; username?: string; avatar?: string } }>; 
  views?: number;
  stock_quantity?: number;
  user?: { id?: number; name?: string; username?: string; avatar?: string };
};

function formatMZN(value?: number) {
  if (typeof value !== 'number') return '0,00 MZN';
  try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value} MZN`; }
}

export default function ProductScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<ProdutoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [qty, setQty] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const { getProductFromCache, ensureProductDetail, upsertProductDetail } = useHome();
  const { token, isAuthenticated } = useAuth();

  const images = useMemo(() => {
    if (!product) return [] as string[];
    let arr: string[] = [];
    if (Array.isArray(product.images)) {
      arr = product.images;
    } else if (typeof product.images === 'string') {
      arr = product.images.split(',').map(s => s.trim()).filter(Boolean);
    }
    const withThumb = product.thumb ? [product.thumb, ...arr] : arr;
    const dedup = withThumb.filter((v, i, a) => a.indexOf(v) === i);
    return dedup.length ? dedup : ['https://via.placeholder.com/800x600?text=Produto'];
  }, [product]);

  const fetchProduct = useCallback(async () => {
    if (!slug) return;
    try {
      setError(null);
      // Mostrar cache imediato se existir
      const cached = getProductFromCache(slug);
      if (cached) {
        setProduct(cached as ProdutoDetalhe);
        setLoading(false);
      } else {
        setLoading(true);
      }
      // Garantir detalhes atualizados (sem reprocessar se já houver)
      const detail = await ensureProductDetail(slug, 0);
      if (detail) {
        setProduct(detail as ProdutoDetalhe);
        // Debug: verificar liked e token
        console.log('[ProductScreen] detail loaded', { slug, liked: (detail as any)?.liked, hasToken: !!token });
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar produto');
    } finally {
      setLoading(false);
    }
  }, [slug, getProductFromCache, ensureProductDetail, token]);

  useEffect(() => {
    // Only fetch if we don't have a product or if slug changed
    if (!product || (product && product.slug !== slug)) {
      fetchProduct();
    }
  }, [slug]); // Only depend on slug

  const createOrder = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Atenção', 'Precisa fazer login para fazer pedidos');
      router.push('/login');
      return;
    }

    if (!product || !token) {
      Alert.alert('Erro', 'Dados do produto não disponíveis');
      return;
    }

    if (product.stock_quantity !== undefined && product.stock_quantity < qty) {
      Alert.alert('Erro', `Quantidade solicitada (${qty}) excede o estoque disponível (${product.stock_quantity})`);
      return;
    }

    if (qty < 1) {
      Alert.alert('Erro', 'Quantidade deve ser pelo menos 1');
      return;
    }

    // Confirmar pedido
    Alert.alert(
      'Confirmar Pedido',
      `Deseja fazer pedido de ${qty}x ${product.title} por ${formatMZN(product.price * qty)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setOrderLoading(true);
              
              const orderData = new URLSearchParams();
              orderData.append('produto_id', product.id.toString());
              orderData.append('quantidade', qty.toString());
              orderData.append('preco_unitario', product.price.toString());
              orderData.append('total', (product.price * qty).toString());
              
                            const response = await postJson('/pedidos/criar', orderData, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              });

              Alert.alert(
                'Pedido Criado!', 
                'Seu pedido foi enviado com sucesso. Aguarde a confirmação do vendedor.',
                [
                  {
                    text: 'Ver Meus Pedidos',
                    onPress: () => router.push('/pedidos')
                  },
                  {
                    text: 'OK',
                    style: 'default'
                  }
                ]
              );

            } catch (error: any) {
              console.error('Erro ao criar pedido:', error);
              const errorMessage = error?.response?.data?.detail || error?.message || 'Erro ao criar pedido';
              Alert.alert('Erro', errorMessage);
            } finally {
              setOrderLoading(false);
            }
          }
        }
      ]
    );
  }, [isAuthenticated, product, token, qty, router]);

  const onShare = useCallback(async () => {
    try {
      if (!product) return;
      const url = `https://skyvenda-mz.vercel.app/produto/${product.slug}`;
      await Share.share({
        title: product.title,
        message: `${product.title} - ${formatMZN(product.price)}\n${url}`,
        url,
      });
    } catch (e) {
      // noop
    }
  }, [product]);

  const toggleLike = useCallback(async () => {
    if (!product || likeBusy) return;
    if (!isAuthenticated || !token) {
      Alert.alert('Atenção', 'Precisa fazer login para curtir produtos');
      router.push('/login');
      return;
    }
    try {
      setLikeBusy(true);
      // otimismo
      const optimistic = { ...product, liked: !product.liked, likes: (product.likes || 0) + (product.liked ? -1 : 1) } as ProdutoDetalhe;
      setProduct(optimistic);
      // propaga para o cache global
      upsertProductDetail(optimistic as any);
      await postJson(`/produtos/${product.slug}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // rollback simples
      setProduct(p => (p ? { ...p, liked: !p.liked, likes: (p.likes || 0) + (p.liked ? -1 : 1) } : p));
    } finally {
      setLikeBusy(false);
    }
  }, [product, likeBusy, upsertProductDetail, isAuthenticated, token, router]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-4"> 
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text className="text-gray-500">Carregando produto...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4"> 
        <Text className="text-red-600 mb-3 text-center">{error}</Text>
        <TouchableOpacity className="bg-violet-600 p-3 rounded-lg" onPress={fetchProduct}>
          <Text className="text-white font-bold">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) return null;

  return (
    <View className="flex-1 bg-white">
      {/* App bar with icons - Fixed at top */}
      <View className="absolute top-0 left-0 right-0 z-20">
        <View className="flex-row items-center justify-between px-4 py-3 mt-8">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-full bg-black/20 items-center justify-center"
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={toggleLike} 
              className="w-10 h-10 rounded-full items-center justify-center"
              style={styles.iconButton}
            >
              <Ionicons name={product.liked ? 'heart' : 'heart-outline'} size={24} color={product.liked ? '#DC2626' : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onShare} 
              className="w-10 h-10 rounded-full items-center justify-center"
              style={styles.iconButton}
            >
              <Ionicons name="share-social-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="bg-white" contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Gallery */}
      <View className="w-full h-full bg-white">
        <Image source={{ uri: images[currentImage] }} className="w-full h-full" />
        {images.length > 1 ? (
          <View className="absolute bottom-3 left-0 right-0 flex-row justify-center">
            {images.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setCurrentImage(i)} className={`w-1.5 h-1.5 rounded-full bg-white opacity-60 mx-1 ${i === currentImage ? 'w-6' : ''}`} />
            ))}
          </View>
        ) : null}
      </View>

      {/* Content Card overlapping image */}
      <View className="bg-white mt-[-20px] px-5 py-3 rounded-t-3xl shadow-md">
        {/* Title + Price */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-lg font-bold text-gray-800" numberOfLines={2}>{product.title}</Text>
            {!!product.province && (
              <View className="flex-row items-center gap-1.5 mt-1.5">
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text className="text-gray-500">{product.province}</Text>
              </View>
            )}
          </View>
          <View className="items-end">
            <Text className="text-lg font-bold text-violet-600 text-right">{formatMZN(product.price)}</Text>
            {!!product.time && <Text className="text-gray-500">Publicado {product.time}</Text>}
          </View>
        </View>

        {/* Stats (clickable) */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 ,height:50}}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleLike}
            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 24, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name={product.liked ? 'heart' : 'heart-outline'} size={24} color={product.liked ? '#DC2626' : '#374151'} />
            <Text style={{ color: '#374151', fontWeight: '600' }}>{product.likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Visualizações', 'Em breve: lista de visualizações')}
            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name="eye-outline" size={24} color="#374151" />
            <Text style={{ color: '#374151', fontWeight: '600' }}>{product.views || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert('Comentários', 'Em breve: seção de comentários')}
            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#374151" />
            <Text style={{ color: '#374151', fontWeight: '600' }}>{product.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Quantity */}
        <View className="mt-3">
          <Text className="text-sm font-bold text-gray-800 mb-1.5">Quantidade</Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center bg-gray-100 rounded-full px-2 py-1.5 gap-3">
              <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-8 rounded-full bg-gray-200 items-center justify-center"><Text className="text-gray-800 font-bold text-lg">-</Text></TouchableOpacity>
              <Text className="min-w-6 text-center font-bold text-gray-800">{qty}</Text>
              <TouchableOpacity onPress={() => setQty(q => Math.min(product.stock_quantity || 1, q + 1))} className="w-9 h-8 rounded-full bg-gray-200 items-center justify-center"><Text className="text-gray-800 font-bold text-lg">+</Text></TouchableOpacity>
            </View>
            <View className="items-end">
              <Text className="text-gray-500">Estoque disponível</Text>
              <Text className="text-gray-800 font-semibold">{product.stock_quantity || 0} unidades</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-3">
          <TouchableOpacity 
            className="bg-violet-600 p-4 rounded-lg mb-2"
            onPress={createOrder}
            disabled={orderLoading}
          >
            {orderLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text className="text-white font-bold text-center">Criando Pedido...</Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-center">Fazer Pedido</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="border border-violet-600 p-4 rounded-lg"
            onPress={() => {
              if (!isAuthenticated) {
                Alert.alert('Atenção', 'Precisa fazer login para comprar');
                router.push('/login');
                return;
              }
              Alert.alert('Compra Direta', 'Funcionalidade em desenvolvimento');
            }}
          >
            <Text className="text-violet-600 font-bold text-center">Comprar Agora</Text>
          </TouchableOpacity>
          
          <TouchableOpacity>
            <Text className="text-violet-600 mt-2.5 text-center">Ler as políticas de compra no SkyVenda MZ</Text>
          </TouchableOpacity>
        </View>

        {/* Seller */}
        {product.user ? (
          <View className="mt-4">
            <View className="flex-row items-center gap-3">
              <Image source={{ uri: product.user.avatar || 'https://skyvenda-mz.vercel.app/avatar.png' }} className="w-12 h-12 rounded-full" />
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">{product.user.name}</Text>
                {!!product.user.username && <Text className="text-gray-500">@{product.user.username}</Text>}
              </View>
            </View>
          </View>
        ) : null}

        {/* Description */}
        {!!product.description && (
          <View className="mt-4">
            <Text className="text-lg font-bold text-gray-800 mb-2">Descrição</Text>
            <Text className="text-gray-700">{product.description}</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    
  },
});
