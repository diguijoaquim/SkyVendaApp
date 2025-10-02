import BannerSlider from '@/components/ads/banner_slider';
import NewPostInput from '@/components/new_post_input';
import Nhonguistas from '@/components/nhonguistas';
import FeaturedProducts from '@/components/products/FeaturedProducts';
import News from '@/components/products/news';
import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/contexts/HomeContext';
import { getJson } from '@/services/api';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItemInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';
import FriendsSuggestionSection from './FriendsSuggestionSection';
import AdCard from './items/AdCard';
import FriendSuggestionCard from './items/FriendSuggestionCard';
import PostCard from './items/PostCard';
import ProductCard from './items/ProductCard';

const DEBUG = true;
const MAX_ITEMS = 80; // Reduzido para melhor performance
const MIN_PAGINATION_INTERVAL = 1000; // Aumentado para evitar calls excessivos
const PREFETCH_THRESHOLD = 100; // Distância do fim para começar prefetch

type FeedType = 'product' | 'post' | 'ad' | 'friend_suggestion';

type FeedItem = {
  type: FeedType;
  timestamp: string;
  data: any;
  id?: string | number; // Adicionar ID único para melhor tracking
};

type FeedResponse = {
  cursor: string | null;
  has_more: boolean;
  items: FeedItem[];
  total_items?: number;
};

export default function DynamicFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string>('1');
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [friendsSuggestions, setFriendsSuggestions] = useState<any[]>([]);
  const { upsertFeedProducts } = useHome();
  const { token } = useAuth();
  
  // Refs para controle de paginação
  const isFirstLoad = useRef(true);
  const lastPaginateAt = useRef(0);
  const paginationInProgress = useRef(false);

  const keyExtractor = useCallback((item: FeedItem, index: number) => {
    // Usar ID estável; evitar timestamp para não regenerar chaves
    const dataId = item?.data?.id;
    const uniqueId = item.id || dataId || index;
    return `${item.type}-${uniqueId}`;
  }, []);

  const normalizeItem = useCallback((item: FeedItem): FeedItem => {
    if (item.type === 'product') {
      const data = item.data || {};
      let images: string[] = [];
      
      if (Array.isArray(data.images)) {
        images = data.images;
      } else if (typeof data.images === 'string' && data.images.trim().length > 0) {
        try {
          const parsed = JSON.parse(data.images);
          if (Array.isArray(parsed)) images = parsed;
        } catch {
          // Ignore parsing errors
        }
      }
      
      return {
        ...item,
        id: item.id || data.id || `${item.type}-${Date.now()}-${Math.random()}`,
        data: {
          ...data,
          images,
        },
      };
    }
    
    return {
      ...item,
      id: item.id || item.data?.id || `${item.type}-${Date.now()}-${Math.random()}`,
    };
  }, []);

  // Função de deduplicação mais eficiente
  const deduplicateItems = useCallback((existingItems: FeedItem[], newItems: FeedItem[]): FeedItem[] => {
    const existingIds = new Set(existingItems.map(item => 
      item.id || `${item.type}-${item.data?.id}-${item.timestamp}`
    ));
    
    return newItems.filter(item => {
      const itemId = item.id || `${item.type}-${item.data?.id}-${item.timestamp}`;
      return !existingIds.has(itemId);
    });
  }, []);

  const fetchFeed = useCallback(async (reset = false, cursorOverride?: string) => {
    const now = Date.now();
    
    // Prevenir calls muito frequentes
    if (!reset && (now - lastPaginateAt.current < MIN_PAGINATION_INTERVAL)) {
      if (DEBUG) console.log('[DynamicFeed] Call bloqueado por throttle');
      return;
    }
    
    // Prevenir múltiplos requests simultâneos
    if (paginationInProgress.current) {
      if (DEBUG) console.log('[DynamicFeed] Request já em progresso');
      return;
    }
    
    paginationInProgress.current = true;
    lastPaginateAt.current = now;
    
    if (reset) {
      setLoading(true);
      setRefreshing(false);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);

    try {
      const params = new URLSearchParams();
      let cursorToSend: string | null = null;
      if (reset) {
        cursorToSend = '1';
      } else if (typeof cursorOverride === 'string') {
        cursorToSend = cursorOverride;
      } else if (cursor) {
        cursorToSend = cursor;
      }
      if (cursorToSend) params.set('cursor', cursorToSend);
      params.set('limit', '20');
      
      const url = `/feed?${params.toString()}`;
      if (DEBUG) console.log('[DynamicFeed] Fetching:', { reset, url, itemsCount: items.length, hasToken: !!token });
      
      // Use getJson which automatically includes the token
      const data: FeedResponse & { friends_suggestion?: any[] } = await getJson(url);

      const preparedItems = (data.items || []).map(normalizeItem);
      
      // Capturar sugestões de amigos se disponíveis
      if (data.friends_suggestion && Array.isArray(data.friends_suggestion)) {
        setFriendsSuggestions(data.friends_suggestion);
      }
      // Atualiza o cache global com produtos do feed
      try {
        const productPayload = preparedItems
          .filter((it) => it.type === 'product' && it?.data?.slug)
          .map((it) => it.data);
        if (productPayload.length > 0) upsertFeedProducts(productPayload);
      } catch (cacheErr) {
        // evita travar o feed por erro de cache
        if (DEBUG) console.log('[DynamicFeed] Cache feedProducts erro:', cacheErr);
      }
      
      setItems(prevItems => {
        if (reset) {
          // Reset completo - substitui todos os itens
          if (DEBUG) console.log('[DynamicFeed] Reset - novos itens:', preparedItems.length);
          return preparedItems;
        }
        
        // Paginação - adiciona novos itens sem duplicatas
        const deduplicatedNew = deduplicateItems(prevItems, preparedItems);
        const combined = [...prevItems, ...deduplicatedNew];
        
        // Limitar tamanho para evitar travamentos
        const finalItems = combined.length > MAX_ITEMS 
          ? combined.slice(-MAX_ITEMS) // Manter apenas os últimos itens
          : combined;
        
        if (DEBUG) console.log('[DynamicFeed] Paginação:', {
          previous: prevItems.length,
          new: preparedItems.length,
          deduplicated: deduplicatedNew.length,
          final: finalItems.length
        });
        
        return finalItems;
      });
      
      setCursor(data.cursor || '1');
      setHasMore(Boolean(data.has_more));
      
    } catch (e: any) {
      if (e.name === 'AbortError') {
        if (DEBUG) console.log('[DynamicFeed] Request cancelado');
        return;
      }
      
      const errorMsg = e?.message || 'Erro ao carregar o feed';
      setError(errorMsg);
      if (DEBUG) console.error('[DynamicFeed] Erro:', errorMsg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      paginationInProgress.current = false;
    }
  }, [cursor, items.length, normalizeItem, deduplicateItems, upsertFeedProducts]);

  // Carregar dados iniciais
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      fetchFeed(true);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setCursor('1');
    setHasMore(true);
    fetchFeed(true, '1');
  }, [fetchFeed]);

  // Paginação otimizada no fim da lista
  const onEndReached = useCallback(() => {
    if (loading || loadingMore || paginationInProgress.current) return;
    
    const now = Date.now();
    if (now - lastPaginateAt.current < MIN_PAGINATION_INTERVAL) return;
    
    if (DEBUG) console.log('[DynamicFeed] onEndReached:', { hasMore, itemsCount: items.length });
    
    if (hasMore) {
      fetchFeed(false);
    } else {
      // Reiniciar no início (página 1) com reset para recomeçar a lista
      if (DEBUG) console.log('[DynamicFeed] Fim do feed - reiniciando na página 1 (reset)');
      setCursor('1');
      setHasMore(true);
      fetchFeed(true, '1');
    }
  }, [loading, loadingMore, hasMore, items.length, fetchFeed]);

  // Prefetch quando próximo do fim
  const onScroll = useCallback((event: any) => {
    if (loading || loadingMore || paginationInProgress.current) return;
    
    const { contentOffset, contentSize, layoutMeasurement } = event?.nativeEvent || {};
    if (!contentOffset || !contentSize || !layoutMeasurement) return;
    
    const distanceFromEnd = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    
    // Prefetch quando próximo do fim
    if (distanceFromEnd <= PREFETCH_THRESHOLD && hasMore) {
      const now = Date.now();
      if (now - lastPaginateAt.current >= MIN_PAGINATION_INTERVAL) {
        if (DEBUG) console.log('[DynamicFeed] Prefetch ativado');
        fetchFeed(false);
      }
    }
  }, [loading, loadingMore, hasMore, fetchFeed]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<FeedItem>) => {
    try {
      switch (item.type) {
        case 'product':
          return <ProductCard data={item.data} />;
        case 'post':
          return <PostCard data={item.data} />;
        case 'ad':
          return <View className='px-2'><AdCard data={item.data} /></View>
        case 'friend_suggestion':
          return <FriendSuggestionCard friend={item.data} />;
        default:
          return (
            <></>
          );
      }
    } catch (error) {
      if (DEBUG) console.error('[DynamicFeed] Erro ao renderizar item:', error);
      return <></>
    }
  }, []);

  const ListHeader = useMemo(() => (
    <View>
      <NewPostInput />
      <BannerSlider />
      <News />
      <Nhonguistas />
      <View className='px-2'>
        <FeaturedProducts />
      </View>
      {friendsSuggestions.length > 0 && (
        <FriendsSuggestionSection
          friends={friendsSuggestions}
          onFollow={(friendId) => {
            console.log('Follow friend:', friendId);
            // TODO: Implementar lógica de seguir
          }}
          onViewProfile={(friendId) => {
            console.log('View profile:', friendId);
            // TODO: Implementar navegação para perfil
          }}
          onSeeAll={() => {
            console.log('See all friends');
            // TODO: Implementar navegação para lista completa
          }}
        />
      )}
    </View>
  ), [friendsSuggestions]);

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyWrap}>
      {loading ? (
        <ActivityIndicator size="large" color="#7C3AED" />
      ) : (
        <>
          <Text style={styles.emptyTitle}>Sem conteúdo para mostrar</Text>
          <Text style={styles.emptySubtitle}>Puxe para atualizar ou tente novamente mais tarde.</Text>
          {error && <Text style={styles.errorText}>Erro: {error}</Text>}
        </>
      )}
    </View>
  ), [loading, error]);

  // Skeleton mais leve para footer
  const FooterSkeleton = useMemo(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerSkeletonWrap}>
        <View style={styles.skeletonItem}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonLine, { width: '70%' }]} />
            <View style={[styles.skeletonLine, { width: '40%' }]} />
          </View>
        </View>
      </View>
    );
  }, [loadingMore]);

  const ListFooter = useMemo(() => {
    if (loadingMore) return FooterSkeleton;
    return null; // Sem botão; carregamento é automático
  }, [loadingMore, FooterSkeleton]);


  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={ListEmpty}
      
      // Otimizações de performance
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2} // Reduzido para evitar calls prematuros
      onScroll={onScroll}
      scrollEventThrottle={100} // Reduzido para menos calls
      
      // Performance settings
      initialNumToRender={8}
      maxToRenderPerBatch={5}
      windowSize={8}
      removeClippedSubviews={true}
      getItemLayout={undefined} // Deixar React Native calcular automaticamente
      
      // Pull to refresh
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#7C3AED']}
          tintColor="#7C3AED"
        />
      }
      
      // Configurações adicionais
      nestedScrollEnabled={false} // Desabilitar para melhor performance
      disableVirtualization={false}
      legacyImplementation={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footerWrap: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  endText: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footerSkeletonWrap: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 8,
  },
  unknownBox: {
    margin: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  unknownText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
});