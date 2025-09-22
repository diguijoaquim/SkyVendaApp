import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJson } from '@/services/api';
import { useLoading } from './LoadingContext';

interface Product {
  id: number;
  slug: string;
  title: string;
  price: number;
  thumb?: string;
  images?: string | string[];
  province?: string;
  time?: string;
  description?: string;
  state?: string;
  likes?: number;
  liked?: boolean;
  views?: number;
  stock_quantity?: number;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface Ad {
  id: number;
  title: string;
  image: string;
  link?: string;
}

// Produto com detalhes (estende Product com campos adicionais opcionais)
interface ProductDetail extends Product {
  details?: string; // HTML ou texto
  comments?: Array<{
    id: number;
    text: string;
    date?: string;
    user?: { id?: number; name?: string; username?: string; avatar?: string };
  }>;
}

interface HomeContextType {
  loading: boolean;
  loaded: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  produtos: Product[];
  setProdutos: (produtos: Product[]) => void;
  firstTime: boolean;
  setFirstTime: (firstTime: boolean) => void;
  addOrUpdateProduto: (produto: Product) => void;
  myproducts: Product[];
  addProducts: (products: Product[]) => void;
  ensureMyProductsLoaded: (token?: string | null) => Promise<void>;
  sellers: any[];
  addSellers: (sellers: any[]) => void;
  addProvinceProducts: (province: string, products: Product[]) => void;
  loadProvinceProducts: (province: string) => Promise<Product[]>;
  provinceProducts: Record<string, Product[]>;
  myorders: any[];
  addOrders: (orders: any[]) => void;
  ensureMyOrdersLoaded: (token?: string | null) => Promise<void>;
  ads: Ad[];
  setAds: (ads: Ad[]) => void;
  changeImage: (productSlug: string, newImage: string) => void;
  newMessage: number;
  setNewMessage: (count: number) => void;
  chats: any[];
  setChats: (chats: any[]) => void;
  // Cache e helpers para prosetsdutos/feeds/detalhes
  upsertFeedProducts: (products: Product[]) => void;
  getProductFromCache: (slug: string) => Product | ProductDetail | null;
  upsertProductDetail: (detail: ProductDetail) => void;
  ensureProductDetail: (slug: string, userId?: number) => Promise<ProductDetail | null>;
}

export const HomeContext = createContext<HomeContextType | null>(null);

export const useHome = () => {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHome must be used within a HomeProvider');
  }
  return context;
};

const HomeProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [user_id, setUserID] = useState<number>(0);
  const { setIsLoading } = useLoading();
  const [firstTime, setFirstTime] = useState(true);
  const [myproducts, setMyProducts] = useState<Product[]>([]);
  const [myorders, setMyOrders] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [provinceProducts, setProvinceProducts] = useState<Record<string, Product[]>>({});
  const [ads, setAds] = useState<Ad[]>([]);
  const [newMessage, setNewMessage] = useState(0);
  const [chats, setChats] = useState<any[]>([]);
  // Caches em memória (não persistentes) para produtos carregados pelo feed e detalhes
  const [feedProductsBySlug, setFeedProductsBySlug] = useState<Record<string, Product>>({});
  const [productDetailsBySlug, setProductDetailsBySlug] = useState<Record<string, ProductDetail>>({});

  // Initialize user_id from AsyncStorage
  useEffect(() => {
    const initUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('user_id');
        if (storedUserId) {
          setUserID(parseInt(storedUserId));
        }
      } catch (error) {
        console.error('Error loading user_id:', error);
      }
    };
    initUserId();
  }, []);

  // Load and cache user's own products once
  const ensureMyProductsLoaded = useCallback(async (token?: string | null) => {
    if (myproducts && myproducts.length > 0) return;
    if (!token) return;
    
    try {
      setIsLoading(true);
      
      // Tenta carregar do cache primeiro
      const cachedMyProducts = await loadFromCache<Product[]>('my_products');
      if (cachedMyProducts && cachedMyProducts.length > 0) {
        setMyProducts(cachedMyProducts);
      }
      
      // Tenta buscar da API
      try {
        const res = await getJson<{ produtos?: Product[] }>(`/produtos/produtos/?skip=0&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const produtos = Array.isArray(res?.produtos) ? res!.produtos! : [];
        setMyProducts(produtos);
        // Salva no cache
        await saveToCache('my_products', produtos);
      } catch (e) {
        console.log('Erro ao carregar meus produtos da API, usando cache se disponível', e);
      }
    } catch (e) {
      console.log('Erro ao carregar meus produtos', e);
    } finally {
      setIsLoading(false);
    }
  }, [myproducts, setIsLoading]);

  // Load and cache user's orders once
  const ensureMyOrdersLoaded = useCallback(async (token?: string | null) => {
    if (myorders && myorders.length > 0) return;
    if (!token) return;
    
    try {
      setIsLoading(true);
      
      // Tenta carregar do cache primeiro
      const cachedOrders = await loadFromCache<any[]>('my_orders');
      if (cachedOrders) {
        setMyOrders(cachedOrders);
      }
      
      // Tenta buscar da API
      try {
        const res = await getJson<any[]>(`/pedidos/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orders = Array.isArray(res) ? res : [];
        setMyOrders(orders);
        // Salva no cache
        await saveToCache('my_orders', orders);
      } catch (e) {
        console.log('Erro ao carregar pedidos da API, usando cache se disponível', e);
      }
    } catch (e) {
      console.log('Erro ao carregar pedidos', e);
    } finally {
      setIsLoading(false);
    }
  }, [myorders, setIsLoading]);

  // Função genérica para adicionar produtos de uma província
  const addProvinceProducts = useCallback((province: string, products: Product[]) => {
    setProvinceProducts((prev) => ({
      ...prev,
      [province]: products,
    }));
  }, []);

  // Função para carregar produtos de uma província específica
  const loadProvinceProducts = useCallback(
    async (province: string) => {
      // Verifica se já tem em memória
      if (provinceProducts[province]) {
        console.log(`Dados de ${province} já carregados.`);
        return provinceProducts[province];
      }
      
      // Tenta carregar do cache
      const cacheKey = `province_${province}`;
      const cachedProvinceProducts = await loadFromCache<Product[]>(cacheKey);
      if (cachedProvinceProducts) {
        console.log(`Dados de ${province} carregados do cache.`);
        addProvinceProducts(province, cachedProvinceProducts);
        return cachedProvinceProducts;
      }

      try {
        setIsLoading(true);
        const response = await getJson<Product[]>(`/produtos/pesquisa/?termo=${province}`);
        addProvinceProducts(province, response);
        console.log(`Dados de ${province} carregados com sucesso.`);
        // Salva no cache
        await saveToCache(cacheKey, response);
        return response;
      } catch (err) {
        console.error(`Erro ao carregar dados de ${province}`, err);
        // Se tiver cache expirado, retorna ele mesmo assim
        if (cachedProvinceProducts) {
          return cachedProvinceProducts;
        }
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [provinceProducts, user_id, setIsLoading, addProvinceProducts]
  );

  const changeImage = (productSlug: string, newImage: string) => {
    // Update myProducts state
    setMyProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.slug === productSlug
          ? { ...product, thumb: newImage }
          : product
      )
    );

    // Update produtos state
    setProdutos((prevProducts) =>
      prevProducts.map((product) =>
        product.slug === productSlug
          ? { ...product, thumb: newImage }
          : product
      )
    );
  };

  // Inserir/atualizar cache de produtos vindos do feed (em memória)
  const upsertFeedProducts = useCallback((products: Product[]) => {
    if (!Array.isArray(products) || products.length === 0) return;
    setFeedProductsBySlug((prev) => {
      const next = { ...prev } as Record<string, Product>;
      for (const p of products) {
        if (!p?.slug) continue;
        const existing = next[p.slug];
        next[p.slug] = existing ? { ...existing, ...p } : p;
      }
      return next;
    });
  }, []);

  // Atualiza/insere detalhes completos no cache e mantém consistência
  const upsertProductDetail = useCallback((detail: ProductDetail) => {
    if (!detail?.slug) return;
    setProductDetailsBySlug((prev) => ({
      ...prev,
      [detail.slug]: prev[detail.slug] ? { ...prev[detail.slug], ...detail } : detail,
    }));
    // Também reflete no cache básico do feed e na lista geral de produtos
    setFeedProductsBySlug((prev) => ({
      ...prev,
      [detail.slug]: prev[detail.slug] ? { ...prev[detail.slug], ...detail } : detail,
    }));
    setProdutos((prev) => {
      const idx = prev.findIndex((x) => x.slug === detail.slug);
      if (idx === -1) return [...prev, detail];
      const clone = [...prev];
      clone[idx] = { ...clone[idx], ...detail } as Product;
      return clone;
    });
  }, []);

  // Busca um produto em qualquer cache conhecido (detalhes -> feed -> listas)
  const getProductFromCache = useCallback((slug: string): Product | ProductDetail | null => {
    if (!slug) return null;
    if (productDetailsBySlug[slug]) return productDetailsBySlug[slug];
    if (feedProductsBySlug[slug]) return feedProductsBySlug[slug];
    const inProdutos = produtos.find((p) => p.slug === slug);
    if (inProdutos) return inProdutos;
    const inMy = myproducts.find((p) => p.slug === slug);
    if (inMy) return inMy;
    for (const prov of Object.keys(provinceProducts)) {
      const arr = provinceProducts[prov] || [];
      const f = arr.find((p) => p.slug === slug);
      if (f) return f;
    }
    return null;
  }, [productDetailsBySlug, feedProductsBySlug, produtos, myproducts, provinceProducts]);

  // Garante que detalhes estão no cache; evita re-fetch se já houver detalhe suficiente
  const ensureProductDetail = useCallback(async (slug: string, userId?: number): Promise<ProductDetail | null> => {
    if (!slug) return null;
    const cached = productDetailsBySlug[slug] || (getProductFromCache(slug) as ProductDetail | null);
    if (cached && (cached.description || cached.details)) {
      return cached;
    }
    try {
      const detail = await getJson<ProductDetail>(`/produtos/detalhe/${slug}?user_id=${userId ?? 0}`);
      if (detail) {
        upsertProductDetail(detail);
        return detail;
      }
      return cached ?? null;
    } catch (e) {
      return cached ?? null;
    }
  }, [productDetailsBySlug, getProductFromCache, upsertProductDetail]);

  // Função para salvar dados no cache
  const saveToCache = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(`@cache_${key}`, JSON.stringify({
        data,
        timestamp: new Date().getTime()
      }));
    } catch (error) {
      console.error('Erro ao salvar no cache:', error);
    }
  };

  // Função para carregar dados do cache
  const loadFromCache = async <T,>(key: string, maxAgeHours = 24): Promise<T | null> => {
    try {
      const cached = await AsyncStorage.getItem(`@cache_${key}`);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const cacheAgeHours = (new Date().getTime() - timestamp) / (1000 * 60 * 60);
      
      if (cacheAgeHours > maxAgeHours) return null; // Cache expirado
      
      return data as T;
    } catch (error) {
      console.error('Erro ao carregar do cache:', error);
      return null;
    }
  };

  // Função para carregar os dados iniciais
  const LoadData = useCallback(async () => {
    // Se já tiver produtos no contexto, não precisa recarregar
    if (produtos && produtos.length > 0) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Tenta carregar do cache primeiro
      const cachedProducts = await loadFromCache<Product[]>('products');
      if (cachedProducts && cachedProducts.length > 0) {
        setProdutos(cachedProducts);
      }
      
      // Tenta buscar dados da API
      try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const basePath = user_id && user_id > 0 
          ? `/produtos/?user_id=${user_id}&limit=4&offset=0`
          : `/produtos/?limit=4&offset=0`;
        const response = await getJson<Product[]>(basePath);
        setProdutos(response);
        // Salva no cache
        await saveToCache('products', response);
      } catch (apiError) {
        console.log('Erro na API, usando cache se disponível', apiError);
        // Se não tiver cache e deu erro, mantém array vazio
        if (!cachedProducts) {
          setProdutos([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
    
    // Carrega anúncios
    try {
      // Tenta carregar anúncios do cache
      const cachedAds = await loadFromCache<Ad[]>('ads');
      if (cachedAds) {
        setAds(cachedAds);
      }
      
      // Tenta buscar anúncios da API
      try {
        const adsResponse = await getJson<Ad[]>('/produtos/anuncios/tipo?tipo_anuncio=melhores_boladas');
        setAds(adsResponse);
        // Salva no cache
        await saveToCache('ads', adsResponse);
      } catch (adsError) {
        console.log('Erro ao carregar anúncios, usando cache se disponível', adsError);
      }
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
    }
  }, [user_id, setIsLoading, produtos]);

  // Funções auxiliares para controle de loading
  const startLoading = useCallback(() => {
    setLoading(true);
    setIsLoading(true);
  }, [setIsLoading]);

  //funcoes que atualiza o estado usando os componentes filhos
  const addProducts = (products: Product[]) => setMyProducts(products);
  const addSellers = (sellers: any[]) => setSellers(sellers);
  const addOrders = (orders: any[]) => setMyOrders(orders);

  const stopLoading = useCallback(() => {
    setTimeout(() => {
      setLoading(false);
      setLoaded(true);
      setIsLoading(false);
    }, 1000);
  }, [setIsLoading]);

  const addOrUpdateProduto = useCallback((novoProduto: Product) => {
    setProdutos((prevProdutos) => {
      // Procurar o produto existente pelo slug
      const produtoExistente = prevProdutos.find((p) => p.slug === novoProduto.slug);

      if (produtoExistente) {
        // Checar se algo mudou realmente no produto
        const produtoAtualizado = { ...produtoExistente, ...novoProduto };
        if (JSON.stringify(produtoExistente) !== JSON.stringify(produtoAtualizado)) {
          return prevProdutos.map((p) => 
            p.slug === novoProduto.slug ? produtoAtualizado : p
          );
        }
        // Não fazer nada se não houve alterações
        return prevProdutos;
      }

      // Adicionar o novo produto ao array
      return [...prevProdutos, novoProduto];
    });
  }, []);

  useEffect(() => {
    LoadData();
  }, [LoadData]);

  return (
    <HomeContext.Provider
      value={{
        loading,
        loaded,
        startLoading,
        stopLoading,
        produtos,
        setProdutos,
        firstTime,
        setFirstTime,
        addOrUpdateProduto,
        myproducts,
        addProducts,
        ensureMyProductsLoaded,
        sellers,
        addSellers,
        addProvinceProducts,
        loadProvinceProducts,
        provinceProducts,
        myorders,
        addOrders,
        ensureMyOrdersLoaded,
        ads,
        setAds,
        changeImage,
        newMessage,
        setNewMessage,
        chats,
        setChats,
        upsertFeedProducts,
        getProductFromCache,
        upsertProductDetail,
        ensureProductDetail
      }}
    >
      {children}
    </HomeContext.Provider>
  );
};

export default HomeProvider; 