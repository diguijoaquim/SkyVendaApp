import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard, { Produto } from '../components/ProductCard';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';
import { getJson, BASE_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SearchScreen() {
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Produto[]>([]);
  const [popularProducts, setPopularProducts] = useState<Produto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [suggestedFromHistory, setSuggestedFromHistory] = useState<Produto[]>([]);

  const suggestedSearches = [
    'Celulares', 'Laptops', 'Carros', 'Casas', 'Roupas', 'Móveis', 'Eletrodomésticos', 'Sapatos', 'Bolsas', 'Relógios'
  ];

  const trendingSearches = [
    'iPhone 15', 'Samsung Galaxy', 'MacBook Pro', 'Nike Air Max', 'Adidas', 'Zara', 'H&M'
  ];

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setProducts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Limpar a query completamente antes de fazer nova busca
      const cleanQuery = searchTerm.trim().replace(/[^\w\s\-áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/g, '');
      if (!cleanQuery) {
        setProducts([]);
        return;
      }

      const encodedQuery = encodeURIComponent(cleanQuery);
      const response = await getJson<Produto[]>(`/produtos/pesquisa/?termo=${encodedQuery}&page=1&limit=10`);
      setProducts(response || []);
      // Atualiza histórico
      await saveSearchTerm(cleanQuery);
      // Atualiza sugestões baseadas no histórico
      fetchSuggestionsFromHistory();

    } catch (err) {
      console.error('Erro na pesquisa:', err);
      setError('Erro ao carregar os resultados. Tente novamente.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Persistência do histórico
  const HISTORY_KEY = 'search_history_v1';
  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) setSearchHistory(arr);
    } catch {}
  };
  const saveSearchTerm = async (term: string) => {
    try {
      const t = term.trim();
      if (!t) return;
      setSearchHistory(prev => {
        const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 12);
        AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });
    } catch {}
  };

  // Sugestões baseadas no histórico: pega top 12 termos e busca 1 produto por termo
  const fetchSuggestionsFromHistory = async () => {
    try {
      const terms = (searchHistory || []).slice(0, 12);
      if (terms.length === 0) { setSuggestedFromHistory([]); return; }
      // Faz buscas em paralelo mas limita a 6-8 para evitar carga excessiva
      const limited = terms.slice(0, 8);
      const results = await Promise.all(limited.map(async (t) => {
        try {
          const encoded = encodeURIComponent(t);
          const r = await getJson<Produto[]>(`/produtos/pesquisa/?termo=${encoded}&page=1&limit=1`);
          return (r && Array.isArray(r) && r[0]) ? r[0] : null;
        } catch { return null; }
      }));
      const filtered = results.filter(Boolean) as Produto[];
      setSuggestedFromHistory(filtered);
    } catch {}
  };

  const loadPopularProducts = async () => {
    try {
      const response = await getJson<Produto[]>('/produtos/populares?limit=8');
      setPopularProducts(response || []);
    } catch (err) {
      console.error('Erro ao carregar produtos populares:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      performSearch(query),
      loadPopularProducts()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadHistory();
    loadPopularProducts();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Atualiza sugestões quando histórico muda
  useEffect(() => {
    fetchSuggestionsFromHistory();
  }, [searchHistory]);

  const handleSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
      // Limpar resultados anteriores antes de fazer nova busca
      setProducts([]);
      setError(null);
      performSearch(query.trim());
    }
  };

  const handleProductPress = (product: Produto) => {
    router.push(`/product/${product.slug || product.id}`);
  };

  const handleSuggestedSearch = (term: string) => {
    setQuery(term);
    setHasSearched(true);
    // Limpar resultados anteriores antes de fazer nova busca
    setProducts([]);
    setError(null);
    performSearch(term.trim());
  };

  const renderProduct = ({ item }: { item: Produto }) => (
    <View style={styles.productItem}>
      <ProductCard product={item} onPress={handleProductPress} />
    </View>
  );
  
  const visibleHistory = useMemo(() => showAllHistory ? searchHistory : searchHistory.slice(0, 8), [showAllHistory, searchHistory]);

  const renderSkeleton = () => (
    <View style={styles.productItem}>
      <ProductCardSkeleton />
    </View>
  );

  const renderSuggestedSearch = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.suggestedTag}
      onPress={() => handleSuggestedSearch(item)}
    >
      <Text style={styles.suggestedTagText}>{item}</Text>
    </TouchableOpacity>
  );
  
  // Sugeridos sem duplicar itens já exibidos nos resultados
  const filteredSuggestions = useMemo(() => {
    const keyOf = (p: any) => String(p?.id ?? p?.slug ?? '');
    const seen = new Set<string>((products || []).map(keyOf).filter(Boolean));
    const out: Produto[] = [];
    const outKeys = new Set<string>();
    for (const s of suggestedFromHistory || []) {
      const k = keyOf(s);
      if (!k) continue;
      if (seen.has(k)) continue;
      if (outKeys.has(k)) continue;
      out.push(s);
      outKeys.add(k);
    }
    return out;
  }, [suggestedFromHistory, products]);

  // Helpers para UI compacta do "Ver mais"
  const getProductTitle = (p: any) => (p?.nome || p?.titulo || p?.name || p?.title || '').toString();
  const getProductImage = (p: any) => {
    const arr = Array.isArray(p?.imagens) ? p.imagens : (Array.isArray(p?.images) ? p.images : []);
    return p?.thumb || p?.imagem || p?.capa || p?.foto || p?.image || p?.thumbnail || arr[0] || null;
  };
  const resolveImageUrl = (uri: any) => {
    if (!uri) return null;
    const s = String(uri);
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
    const base = (BASE_URL || '').replace(/\/$/, '');
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${base}${path}`;
  };
  const getProductSubtitle = (p: any) => {
    const preco = p?.preco_promocional ?? p?.preco ?? p?.price;
    if (typeof preco === 'number') return `MZN ${preco}`;
    if (typeof preco === 'string' && preco) return preco;
    return '';
  };

  const renderCompactItem = (product: Produto) => (
    <TouchableOpacity key={product.id} style={styles.compactItem} onPress={() => handleProductPress(product)}>
      <View style={styles.compactImgBox}>
        {getProductImage(product) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image
            source={{ uri: resolveImageUrl(getProductImage(product)) as string }}
            style={styles.compactImg}
          />
        ) : (
          <View style={styles.compactImgPlaceholder} />
        )}
      </View>
      <View style={styles.compactContent}>
        <Text numberOfLines={1} style={styles.compactTitle}>{getProductTitle(product)}</Text>
        {!!getProductSubtitle(product) && (
          <Text numberOfLines={1} style={styles.compactSubtitle}>{getProductSubtitle(product)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={30} color="#8B5CF6" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#8B5CF6" />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              if (hasSearched && text !== initialQuery) {
                setProducts([]);
                setError(null);
              }
            }}
            placeholder="Pesquisar produtos..."
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
              <Feather name="x" size={18} color="#8B5CF6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!hasSearched && !initialQuery && (
          <View style={styles.suggestionsContainer}>
            {searchHistory.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={styles.sectionHeader}>
                  <Feather name="clock" size={20} color="#8B5CF6" />
                  <Text style={styles.sectionTitle}>Histórico de pesquisa</Text>
                  <View style={{ flex: 1 }} />
                  {searchHistory.length > 8 && (
                    <TouchableOpacity onPress={() => setShowAllHistory(v => !v)}>
                      <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>{showAllHistory ? 'ver menos' : 'ver mais'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={visibleHistory}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.historyTag} onPress={() => handleSuggestedSearch(item)}>
                      <Text style={styles.historyTagText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestedList}
                />
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Tendências</Text>
            </View>
            <FlatList
              data={trendingSearches}
              renderItem={renderSuggestedSearch}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedList}
            />

            <View style={styles.sectionHeader}>
              <Feather name="tag" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Categorias populares</Text>
            </View>
            <FlatList
              data={suggestedSearches}
              renderItem={renderSuggestedSearch}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedList}
            />
          </View>
        )}

        {initialQuery && (
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>Resultado de busca</Text>
            <Text style={styles.searchSubtitle}>Você pesquisou por: <Text style={styles.bold}>{initialQuery}</Text></Text>
          </View>
        )}

        {loading ? (
          <View style={styles.productsGrid}>
            {[...Array(6)].map((_, index) => (
              <View key={index} style={styles.productItem}>
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Feather name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.errorTitle}>Erro na pesquisa</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <View style={styles.suggestedContainer}>
                <Text style={styles.suggestedTitle}>Tente pesquisar por:</Text>
                <FlatList
                  data={suggestedSearches}
                  renderItem={renderSuggestedSearch}
                  keyExtractor={(item) => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestedList}
                />
              </View>
            </View>
          </View>
        ) : products.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.sectionHeader}>
              <Feather name="search" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Resultados para "{initialQuery}"</Text>
            </View>
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <ProductCard product={product} onPress={handleProductPress} />
                </View>
              ))}
            </View>
          </View>
        ) : initialQuery ? (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              Nenhum resultado encontrado para "{initialQuery}". Tente outra pesquisa.
            </Text>
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedTitle}>Tente pesquisar por:</Text>
              <FlatList
                data={suggestedSearches}
                renderItem={renderSuggestedSearch}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestedList}
              />
            </View>
          </View>
        ) : null}

        {(filteredSuggestions.length > 0 || popularProducts.length > 0) && (
          <View style={styles.popularSection}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>{filteredSuggestions.length > 0 ? 'Ver mais' : 'Produtos populares'}</Text>
            </View>
            <View style={styles.productsGrid}>
              {(filteredSuggestions.length > 0 ? filteredSuggestions : popularProducts)
                .slice(0, 12)
                .map((product) => (
                  <View key={product.id} style={styles.productItem}>
                    {renderCompactItem(product)}
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { 
    paddingVertical: 4, 
    paddingHorizontal: 4,
  },
  container: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 14, color: '#111827' },
  clearButton: {
    paddingHorizontal:4,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  searchHeader: {
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  searchSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  bold: {
    fontWeight: '700',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  productItem: {
    width: '48%',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  popularSection: {
    marginBottom: 24,
  },
  errorContainer: {
    marginBottom: 24,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestedContainer: {
    width: '100%',
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  suggestedList: {
    paddingHorizontal: 4,
  },
  suggestedTag: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestedTagText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  // Compact "Ver mais" item UI
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 56,
  },
  compactImgBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  compactImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  compactImgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyTag: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  historyTagText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
