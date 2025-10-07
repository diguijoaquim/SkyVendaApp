import { useAuth } from '@/contexts/AuthContext';
import { getJson, postJson, putJson, del, BASE_URL } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type Product = {
  id: number;
  slug: string;
  title?: string;
  price?: number;
  category?: string;
  type?: string;
  stock?: number;
  stock_quantity?: number; // backend field
  estado?: string;
  ativo?: boolean;
  active?: boolean;
  autorenovacao?: boolean;
  auto_renovacao?: boolean;
  autoRenew?: boolean;
  thumb?: string;
  description?: string;
  content?: string;
  views?: number | string;
  likes?: number | string;
  comments?: any[];
};

export default function MyProductsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos'|'activos'|'desativados'|'autorenovacao'>('todos');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuItem, setMenuItem] = useState<Product | null>(null);

  const updateProductInState = (predicate: (p: Product) => boolean, updater: (p: Product) => Product) => {
    setProducts(prev => prev.map(p => (predicate(p) ? updater(p) : p)));
  };

  const activateBolada = async (p: Product) => {
    if (!token) return;
    try {
      await postJson(`/produtos/${p.id}/renovar`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updateProductInState(x => x.id === p.id, x => ({ ...x, ativo: true, active: true }));
      Alert.alert('Sucesso', 'Produto ativado com sucesso');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao ativar');
    }
  };

  const toggleAutoRenovacao = async (p: Product, enable: boolean) => {
    if (!token) return;
    try {
      await putJson(`/produtos/${p.id}/autorenovacao?autorenovacao=${enable}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updateProductInState(x => x.id === p.id, x => ({ ...x, autorenovacao: enable, auto_renovacao: enable, autoRenew: enable }));
      Alert.alert('Sucesso', enable ? 'Autorrenovação ativada' : 'Autorrenovação desativada');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao atualizar autorrenovação');
    }
  };

  const tornarNegociavel = async (p: Product) => {
    if (!token) return;
    try {
      await putJson(`/produtos/${p.id}/negociavel?negociavel=true`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Sucesso', 'Produto marcado como negociável');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao tornar negociável');
    }
  };

  const fetchProducts = async () => {
    if (!token) { setError('Usuário não autenticado'); setLoading(false); return; }
    try {
      setLoading(true);
      const res = await getJson<{ produtos: Product[] }>(`/produtos/produtos/?skip=0&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(Array.isArray(res?.produtos) ? res.produtos : []);
      setError(null);
    } catch (e: any) {
      // Tentar extrair detalhes do erro
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message;
      if (status === 404) {
        // Considerar como lista vazia, sem marcar como erro
        setProducts([]);
        setError(null);
      } else {
        setError(detail ? `Erro ao buscar produtos${status ? ` (HTTP ${status})` : ''}: ${String(detail)}` : 'Erro ao buscar produtos');
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [token]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter(p => {
      const title = (p.title || '').toLowerCase();
      const matches = !s || title.includes(s);
      const isActive = Boolean(p.ativo ?? p.active ?? false);
      const isAutoRenew = Boolean(p.autorenovacao ?? p.auto_renovacao ?? p.autoRenew ?? false);
      const statusOk = status === 'todos' ||
        (status === 'activos' && isActive) ||
        (status === 'desativados' && !isActive) ||
        (status === 'autorenovacao' && isAutoRenew);
      return matches && statusOk;
    });
  }, [products, search, status]);

  const counts = useMemo(() => {
    return products.reduce((acc, p) => {
      const isActive = Boolean(p.ativo ?? p.active ?? false);
      const isAutoRenew = Boolean(p.autorenovacao ?? p.auto_renovacao ?? p.autoRenew ?? false);
      acc.todos += 1; if (isActive) acc.activos += 1; else acc.desativados += 1; if (isAutoRenew) acc.autorenovacao += 1; return acc;
    }, { todos: 0, activos: 0, desativados: 0, autorenovacao: 0 } as Record<string, number>);
  }, [products]);

  const renderItem = ({ item }: { item: Product }) => {
    const img = normalizeImageUrl(item.thumb);
    return (
      <TouchableOpacity className="bg-white p-3 rounded-lg border border-gray-200" activeOpacity={0.85}>
        <View className="flex-row gap-3" style={{ height: 96 }}>
          <Image
            source={{ uri: img }}
            style={{ width: 96, height: '100%', borderRadius: 10, backgroundColor: '#F3F4F6' }}
            resizeMode="cover"
          />
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{item.title || '—'}</Text>
              <Text className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{Boolean(item.ativo ?? item.active) ? 'Ativo' : 'Inativo'}</Text>
            </View>
            <View className="mt-1.5">
              <Text className="text-[13px] text-gray-700">Preço: {typeof item.price === 'number' ? formatCurrency(item.price) : '—'}</Text>
              <Text className="text-[13px] text-gray-700">Estoque: {getStock(item)}</Text>
            </View>
            {/* Stats + Actions on the same row */}
            <View className="flex-row items-center justify-between mt-2.5">
              <View className="flex-row gap-3">
                <Text className="text-[12px] text-gray-500">👁️ {toNum(item.views)}</Text>
                <Text className="text-[12px] text-gray-500">💬 {Array.isArray(item.comments) ? item.comments.length : toNum(undefined)}</Text>
                <Text className="text-[12px] text-gray-500">❤️ {toNum(item.likes)}</Text>
              </View>
              <View className="flex-row gap-2 items-center">
                <TouchableOpacity
                  className="py-2 px-3 rounded-full border border-green-600 bg-green-100"
                  onPress={() => router.push({ pathname: '/produtos/anunciar/[id]', params: { id: String(item.id) } })}
                >
                  <Text className="font-bold text-green-700">Turbinar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-9 h-9 items-center justify-center rounded-full border border-gray-300 bg-white"
                  onPress={() => { setMenuItem(item); setMenuVisible(true); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between bg-violet-600 px-3 py-3">
        <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Meus Produtos</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="p-3" style={{ gap: 8 }}>
        <View className="flex-row items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Pesquisar produtos..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-gray-900 py-1"
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          {(['todos','activos','desativados','autorenovacao'] as const).map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => setStatus(key)}
              className={`py-1.5 px-2.5 rounded-full ${status===key ? 'bg-violet-100' : 'bg-gray-100'}`}
            >
              <Text className={`font-semibold ${status===key ? 'text-violet-600' : 'text-gray-500'}`}>
                {labelTab(key)} ({counts[key] || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="flex-1 px-3 pb-4">
        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : error ? (
          <Text className="text-red-600">{error}</Text>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Ionicons name="bag-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 mt-2">
              {search ? 'Não encontramos produtos para a pesquisa.' : 'Não encontramos produtos.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.slug}
            renderItem={renderItem}
            contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
          />
        )}
      </View>

      {/* Menu de ações */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setMenuVisible(false)}>
          <View className="absolute left-4 right-4 bottom-6 bg-white rounded-2xl p-3" style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 }}>
            <MenuItem label="Editar" onPress={() => { if (menuItem) router.push({ pathname: '/produtos/editar/[slug]', params: { slug: menuItem.slug } }); setMenuVisible(false); }} />
            <MenuItem label="Turbinar a bolada" onPress={() => { if (menuItem) router.push({ pathname: '/produtos/anunciar/[id]', params: { id: String(menuItem.id) } }); setMenuVisible(false); }} />
            <MenuItem label="Ativar autorenovação" onPress={() => { if (menuItem) toggleAutoRenovacao(menuItem, true); setMenuVisible(false); }} />
            <MenuItem label="Tornar Negociável" onPress={() => { if (menuItem) tornarNegociavel(menuItem); setMenuVisible(false); }} />
            <MenuItem label="Excluir" destructive onPress={() => { if (menuItem) Alert.alert('Excluir', 'Confirma excluir este produto?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => {/* TODO: implementar endpoint delete */} }
            ]); setMenuVisible(false); }} />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function labelTab(k: 'todos'|'activos'|'desativados'|'autorenovacao') {
  switch (k) {
    case 'activos': return 'Activos';
    case 'desativados': return 'Desativados';
    case 'autorenovacao': return 'Auto-renovação';
    default: return 'Todos';
  }
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return '—';
  try {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  } catch { return `${value}`; }
}

function normalizeImageUrl(url?: string) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'https://via.placeholder.com/160x160?text=Produto';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = BASE_URL?.replace(/\/$/, '') || '';
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function getStock(p: Product) {
  const direct = p.stock;
  const alt = p.stock_quantity as any;
  const v = typeof direct === 'number' ? direct : (typeof alt === 'number' ? alt : Number(alt));
  return Number.isFinite(v) ? v : '—';
}

function toNum(v: any) {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function MenuItem({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center py-3 px-2 rounded-lg">
      <Text className={`text-[15px] ${destructive ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

// Tailwind via NativeWind classes are used above; StyleSheet removed.
