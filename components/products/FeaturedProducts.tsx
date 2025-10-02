import ProductCard from '@/components/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { getJson } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type Produto = {
  id: number;
  title: string;
  price: number;
  thumb?: string;
  slug: string;
  state?: string;
  comments?: number;
  views?: number;
  liked?: boolean;
  likes?: number;
  user?: {
    username?: string;
    name?: string;
    avatar?: string;
  };
  // Campos antigos (se vierem de outra API)
  nome?: string;
  preco?: number;
  imagem?: string;
  descricao?: string;
};

const ITEMS_PER_PAGE = 10;

export default function FeaturedProducts() {
  const router = useRouter();
  const { token } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(async (pageNum: number) => {
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;
    // onrender API: /produtos/?limit=30&offset=0
    const data = await getJson<Produto[]>(`/produtos/?limit=${ITEMS_PER_PAGE}&offset=${offset}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return Array.isArray(data) ? data : [];
  }, [token]);

  const initialLoad = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const list = await fetchPage(1);
      setProdutos(list);
      setHasMore(list.length === ITEMS_PER_PAGE);
      setPage(2);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await fetchPage(1);
      setProdutos(list);
      setHasMore(list.length === ITEMS_PER_PAGE);
      setPage(2);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;
    try {
      setIsLoadingMore(true);
      setError(null);
      const list = await fetchPage(page);
      if (!list.length) {
        setHasMore(false);
        return;
      }
      // dedupe
      setProdutos(prev => {
        const existing = new Set(prev.map(p => p.id));
        const uniques = list.filter(p => !existing.has(p.id));
        if (uniques.length < ITEMS_PER_PAGE) setHasMore(false);
        return uniques.length ? [...prev, ...uniques] : prev;
      });
      setPage(p => p + 1);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar mais produtos');
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, hasMore, isLoadingMore, loading, fetchPage]);

  // Amostra aleatória de até 10 produtos
  const sampledProdutos = useMemo(() => {
    if (!Array.isArray(produtos) || produtos.length === 0) return [] as Produto[];
    const copy = [...produtos];
    // Fisher-Yates shuffle parcial até 10
    const max = Math.min(10, copy.length);
    for (let i = 0; i < max; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, max);
  }, [produtos]);

  const renderItem = useCallback(({ item }: { item: Produto }) => (
    <View style={styles.cardWrap}>
      <ProductCard
        product={item}
        onPress={() => {
          if (item.slug) {
            router.push({ pathname: '/product/[slug]', params: { slug: String(item.slug) } });
          }
        }}
      />
    </View>
  ), [router]);

  const keyExtractor = useCallback((item: Produto) => String(item.id), []);

  const ListFooter = useMemo(() => () => (
    <View style={{ paddingVertical: 16 }}>
      <TouchableOpacity onPress={() => router.push('/produtos')}>
        <View style={{ backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Ver mais produtos</Text>
        </View>
      </TouchableOpacity>
    </View>
  ), [router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Carregando produtos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text className='text-orange-500 text-center ' style={{marginBottom:10}}>{error}</Text>
        <TouchableOpacity className='bg-violet-500 px-4 py-2 rounded-md' onPress={initialLoad}>
          <Text className='text-white font-bold'>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={sampledProdutos}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      numColumns={2}
      columnWrapperStyle={styles.rowWrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      // Desabilita auto-carregamento; usa botão no footer
      onEndReachedThreshold={undefined as any}
      onEndReached={undefined as any}
      ListEmptyComponent={() => (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
        </View>
      )}
      ListFooterComponent={ListFooter}
    />
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
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
  rowWrap: { justifyContent: 'space-between' },
  cardWrap: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 ,minHeight:200},
  loadingText: { marginTop: 8, color: '#6B7280' },
  emptyText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  footerText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
});
