import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  ActivityIndicator,
  StyleSheet,
  Platform, 
  StatusBar, 
  Alert,
  ScrollView,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getJson } from '../services/api';
import ProductCard, { Produto } from '../components/ProductCard';
import ProductCardSkeleton from '../components/skeletons/ProductCardSkeleton';

export default function SearchScreen() {
  const { q: initialQuery } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Produto[]>([]);
  const [popularProducts, setPopularProducts] = useState<Produto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

    } catch (err) {
      console.error('Erro na pesquisa:', err);
      setError('Erro ao carregar os resultados. Tente novamente.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
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
    loadPopularProducts();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#8B5CF6" />
        </TouchableOpacity>
        <Text style={styles.title}>Pesquisar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#8B5CF6" />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              // Se o usuário começar a digitar uma nova busca, limpar resultados anteriores
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

        {!hasSearched && !initialQuery && (
          <View style={styles.suggestionsContainer}>
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

        {popularProducts.length > 0 && (
          <View style={styles.popularSection}>
            <View style={styles.sectionHeader}>
              <Feather name="trending-up" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Produtos populares</Text>
            </View>
            <View style={styles.productsGrid}>
              {popularProducts.slice(0, 6).map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <ProductCard product={product} onPress={handleProductPress} />
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#8B5CF6' },
  container: { flex: 1, padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: { flex: 1, marginLeft: 8, fontSize: 16, color: '#111827' },
  clearButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  searchHeader: {
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 20,
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
});
