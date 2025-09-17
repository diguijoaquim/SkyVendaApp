import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getJson } from '@/services/api';

export type Product = {
  id: number;
  slug: string;
  title?: string;
  price?: number;
  category?: string;
  type?: string;
  stock?: number;
  estado?: string;
  ativo?: boolean;
  active?: boolean;
  autorenovacao?: boolean;
  auto_renovacao?: boolean;
  autoRenew?: boolean;
  thumb?: string;
  description?: string;
  content?: string;
};

export default function MyProductsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todos'|'activos'|'desativados'|'autorenovacao'>('todos');

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

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity className="bg-white p-3 rounded-lg border border-gray-200" activeOpacity={0.85}>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-gray-900">{item.title || '—'}</Text>
        <Text className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{Boolean(item.ativo ?? item.active) ? 'Ativo' : 'Inativo'}</Text>
      </View>
      <View className="mt-1.5">
        <Text className="text-[13px] text-gray-700">Preço: {typeof item.price === 'number' ? formatCurrency(item.price) : '—'}</Text>
        <Text className="text-[13px] text-gray-700">Estoque: {typeof item.stock === 'number' ? item.stock : '—'}</Text>
      </View>
      <View className="flex-row gap-2 mt-2.5">
        <TouchableOpacity
          className="py-2 px-3 rounded-full border border-violet-600 bg-violet-100"
          onPress={() => router.push({ pathname: '/produtos/editar/[slug]', params: { slug: item.slug } })}
        >
          <Text className="font-bold text-violet-700">Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="py-2 px-3 rounded-full border border-green-600 bg-green-100"
          onPress={() => router.push({ pathname: '/produtos/anunciar/[id]', params: { id: String(item.id) } })}
        >
          <Text className="font-bold text-green-700">Turbinar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between bg-violet-600 px-3 py-3">
        <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Meus Produtos</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="p-3 space-y-2">
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
    </View>
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

// Tailwind via NativeWind classes are used above; StyleSheet removed.
