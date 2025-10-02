import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/contexts/HomeContext';
import { getJson, postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const imageHeight = Math.round(width * 0.75);

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
  const [adsLoading, setAdsLoading] = useState(false);
  const [ads, setAds] = useState<any[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const { getProductFromCache, ensureProductDetail, upsertProductDetail } = useHome();
  const { token, isAuthenticated, user: authUser } = useAuth() as any;

  // Shuffle helper for ads randomization
  const shuffleArray = useCallback((array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Atualiza comentários buscando detalhes frescos do produto
  const refreshComments = useCallback(async () => {
    if (!slug) return;
    try {
      setCommentsLoading(true);
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const fresh = await getJson<any>(`/produtos/${slug}`, headers as any);
      if (fresh) {
        setProduct(fresh as any);
        upsertProductDetail(fresh as any);
      }
    } catch {
      // noop
    } finally {
      setCommentsLoading(false);
    }
  }, [slug, token, upsertProductDetail]);

  const toggleComments = useCallback(() => {
    if (isCommentsOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsCommentsOpen(false);
        setIsClosing(false);
      }, 250);
    } else {
      setIsCommentsOpen(true);
    }
  }, [isCommentsOpen, refreshComments]);

  const handleComment = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Atenção', 'Precisa fazer login para comentar');
      router.push('/login');
      return;
    }
    if (!product || !slug) return;
    const text = comment?.trim();
    if (!text) return;
    try {
      setIsCommenting(true);
      // Otimismo: adiciona comentário localmente
      const optimistic = {
        id: Math.random(),
        text,
        date: 'agora mesmo',
        user: {
          id: authUser?.id,
          name: authUser?.name || authUser?.username,
          username: authUser?.username,
          avatar: authUser?.perfil || authUser?.avatar || 'avatar.png',
        },
      } as any;
      setProduct(prev => prev ? { ...prev, comments: [ ...(prev.comments || []), optimistic ] } : prev);
      setComment('');

      // Backend espera multipart/form-data
      const form = new FormData();
      form.append('produto_slug', String(slug));
      form.append('conteudo', text);

      const postRes = await fetch(`https://skyvendas-production.up.railway.app/comentarios/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        body: form as any,
      });
      if (!postRes.ok) {
        const txt = await postRes.text().catch(() => '');
        throw new Error(txt || 'Falha ao enviar comentário');
      }

      // Recarrega detalhes para sincronizar (forçando bypass do cache)
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const fresh = await getJson<any>(`/produtos/${slug}`, headers as any);
      if (fresh) {
        setProduct(fresh as any);
        // atualiza cache global também
        upsertProductDetail(fresh as any);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível enviar o comentário');
    } finally {
      setIsCommenting(false);
    }
  }, [isAuthenticated, product, slug, comment, token, ensureProductDetail, router]);

  // Badge helper for ads tipo_anuncio
  const getBadgeInfo = useCallback((tipo?: string) => {
    switch (tipo) {
      case 'melhores_boladas':
        return { text: 'MELHOR BOLADA', color: '#FFFFFF', bgColor: '#DC2626' };
      case 'ofertas_diarias':
        return { text: 'OFERTA DIÁRIA', color: '#FFFFFF', bgColor: '#EA580C' };
      case 'promocoes':
        return { text: 'PROMOÇÃO', color: '#FFFFFF', bgColor: '#7C3AED' };
      case 'destaque':
        return { text: 'DESTAQUE', color: '#FFFFFF', bgColor: '#059669' };
      default:
        return { text: 'OFERTA', color: '#FFFFFF', bgColor: '#374151' };
    }
  }, []);

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

  // Removido auto-carregamento de comentários ao entrar na página

  // Buscar anúncios (horizontais) para sugerir após a descrição
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setAdsLoading(true);
        // Usa a mesma lógica de BannerSlider: /produtos/allads
        const res = await getJson<any[]>(`/produtos/allads`);
        const filtered = (res || []).filter((ad: any) => {
          const hasImage = ad.tipo === 'anuncio2' ? ad.foto : ad.produto_capa;
          return ad?.ativo && hasImage;
        });
        const normalized = filtered.map((ad: any) => ({
          id: ad.id,
          title: ad.titulo && ad.titulo.trim() ? ad.titulo : (ad.nome || ad.produto_nome || 'Sem título'),
          image: ad.tipo === 'anuncio2' ? ad.foto : ad.produto_capa,
          tipo_anuncio: ad.tipo_anuncio,
          location: ad.localizacao && ad.localizacao !== 'null' ? ad.localizacao : 'Moçambique',
          price: Number(ad.preco ?? 0),
          produto_id: ad.produto_id,
          slug: ad.slug,
          link: ad.link,
        }));
        const shuffled = shuffleArray(normalized);
        setAds(shuffled);
      } catch (e) {
        console.error('Erro ao carregar anúncios:', e);
      } finally {
        setAdsLoading(false);
      }
    };
    fetchAds();
  }, []);

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

      <ScrollView className="bg-white " contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" >

      {/* Gallery */}
      <View className="w-full bg-white" style={{ height: imageHeight }}>
        <Image source={{ uri: images[currentImage] }} className="w-full" style={{ height: imageHeight }} />
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
            onPress={toggleComments}
            style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#374151" />
            <Text style={{ color: '#374151', fontWeight: '600' }}>{product.comments?.length || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Panel */}
        {isCommentsOpen && (
          <View
            style={{
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#C7D2FE',
              borderRadius: 8,
              paddingHorizontal: 12,
              backgroundColor: '#EEF2FF',
              marginTop: 12,
            }}
          >
            <View className='py-4'>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
                <Text>{product.comments?.length || 0}</Text> Comentários
              </Text>
              <View style={{ gap: 8, marginBottom: 12, maxHeight: 320 }}>
                <ScrollView
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {commentsLoading && (
                    <View style={{ paddingVertical: 12 }}>
                      <ActivityIndicator size="small" color="#4F46E5" />
                    </View>
                  )}
                  {(product.comments || []).map((c: any) => (
                    <View key={String(c?.id)} style={{ backgroundColor: '#E0E7FF', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, width: '100%' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 2,  overflow: 'hidden' }} className='border-violet-100'>
                        <Image source={{ uri: `${c?.user?.avatar || 'avatar.png'}` }} style={{ width: '100%', height: '100%' }} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontWeight: '700', color: '#3730A3', fontSize: 13 }}>{c?.user?.name || c?.user?.username || 'Usuário'}</Text>
                          {!!c?.date && <Text style={{ color: '#6B7280', fontSize: 12 }}>{c?.date}</Text>}
                        </View>
                        <Text style={{ color: '#4B5563', fontSize: 13 }}>{c?.text}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 10, backgroundColor: '#F9FAFB' }}>
                    <TextInput
                      value={comment}
                      onChangeText={setComment}
                      placeholder={`Comente o ${product.title}`}
                      style={{ paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
                      multiline
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleComment}
                    disabled={isCommenting || !comment.trim()}
                    style={{ padding: 8, height: 40, width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0E7FF', borderRadius: 10, opacity: isCommenting || !comment.trim() ? 0.6 : 1 }}
                    accessibilityLabel="Enviar comentário"
                  >
                    {isCommenting ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <Ionicons name="send" size={18} color="#3730A3" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

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

        {/* Ads horizontais após descrição */}
        <View className="mt-5">
          <Text className="text-lg font-bold text-gray-800 mb-2">Anúncios</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
            {adsLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <View key={idx} style={{ width: 160, marginRight: 12 }}>
                    <View style={{ backgroundColor: '#E5E7EB', width: '100%', height: 110, borderRadius: 12 }} />
                    <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, marginTop: 8, width: 120 }} />
                    <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, marginTop: 6, width: 80 }} />
                  </View>
                ))}
              </>
            ) : (
              (ads || []).slice(0, 12).map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  style={{ width: 160, marginRight: 12 }}
                  activeOpacity={0.85}
                  onPress={async () => {
                    try {
                      const slug = String(item.slug || '').trim();
                      if (slug) {
                        router.push({ pathname: '/product/[slug]', params: { slug } });
                        return;
                      }
                      if (item.link) {
                        await Linking.openURL(item.link);
                        return;
                      }
                      Alert.alert('Aviso', 'Anúncio sem slug ou link');
                    } catch (e) {
                      Alert.alert('Erro', 'Não foi possível abrir o anúncio');
                    }
                  }}
                >
                  <View style={{ backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' }}>
                    {/* Tipo badge (top-left) */}
                    {item.tipo_anuncio ? (
                      <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, backgroundColor: getBadgeInfo(item.tipo_anuncio).bgColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: getBadgeInfo(item.tipo_anuncio).color, fontSize: 10, fontWeight: '800' }}>{getBadgeInfo(item.tipo_anuncio).text}</Text>
                      </View>
                    ) : null}
                    <Image source={{ uri: item.image || 'https://via.placeholder.com/300x200?text=Anuncio' }} style={{ width: '100%', height: 110 }} />
                    <View style={{ padding: 8 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', color: '#111827' }}>{item.title}</Text>
                      {!!item.price && <Text style={{ color: '#7C3AED', fontWeight: '700', marginTop: 2 }}>{formatMZN(item.price)}</Text>}
                      {!!item.location && <Text numberOfLines={1} style={{ color: '#6B7280', marginTop: 2 }}>{item.location}</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    
  },
});
