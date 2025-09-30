import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ProductCard from '@/components/ProductCard';
import { getJson } from '@/services/api';

type Produto = {
  id: number;
  title?: string;
  nome?: string;
  price?: number;
  preco?: number;
  thumb?: string;
  imagem?: string;
  slug: string;
  user?: { name?: string; username?: string; avatar?: string };
};

const ITEMS_PER_PAGE = 20;

export default function ProdutosView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(async (pageNum: number) => {
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;
    const data = await getJson<Produto[]>(`/produtos/?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
    return Array.isArray(data) ? data : [];
  }, []);

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
      // dedupe by id
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

  const renderItem = useCallback(({ item }: { item: Produto }) => (
    <View style={styles.cardWrap}>
      <ProductCard
        product={item}
        onPress={() => {/* navegação dentro do ProductCard já trata slug */}}
      />
    </View>
  ), []);

  const keyExtractor = useCallback((item: Produto) => String(item.id), []);

  const ListFooter = useMemo(() => () => (
    <View style={{ paddingVertical: 16 }}>
      {hasMore ? (
        <TouchableOpacity onPress={loadMore} disabled={isLoadingMore}>
          <View style={{ backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{isLoadingMore ? 'Carregando...' : 'Carregar mais'}</Text>
          </View>
        </TouchableOpacity>
      ) : produtos.length > 0 ? (
        <Text style={styles.footerText}>Não há mais produtos para carregar</Text>
      ) : null}
    </View>
  ), [isLoadingMore, hasMore, produtos.length, loadMore]);

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
      data={produtos}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      numColumns={2}
      columnWrapperStyle={styles.rowWrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={() => (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
        </View>
      )}
      ListFooterComponent={ListFooter}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
  rowWrap: { justifyContent: 'space-between' },
  cardWrap: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 200 },
  loadingText: { marginTop: 8, color: '#6B7280' },
  emptyText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  footerText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
});