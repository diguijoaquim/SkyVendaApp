import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getJson, BASE_URL } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type MyAd = {
  id: number;
  titulo?: string;
  descricao?: string;
  tipo_anuncio?: string;
  produto?: { id: number; nome?: string; preco?: number; slug?: string; capa?: string };
  expira_em?: string | null;
  dias_restantes?: number | null;
  promovido_em?: string | null;
};

export default function MyAdsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ads, setAds] = useState<MyAd[]>([]);
  const [search, setSearch] = useState('');

  const fetchAds = async () => {
    if (!token) { setError('Usuário não autenticado'); setLoading(false); return; }
    try {
      setLoading(true);
      // Endpoint de anúncios do usuário: usando lista geral por tipo como fallback
      const resp = await getJson<any>(`/produtos/anuncios/tipo?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const list: MyAd[] = Array.isArray(resp) ? resp.map((r) => ({
        id: r?.anuncio?.id,
        titulo: r?.anuncio?.titulo,
        descricao: r?.anuncio?.descricao,
        tipo_anuncio: r?.anuncio?.tipo_anuncio,
        produto: {
          id: r?.produto?.id,
          nome: r?.produto?.nome,
          preco: r?.produto?.preco,
          slug: r?.produto?.slug,
          capa: r?.produto?.capa,
        },
        expira_em: r?.anuncio?.expira_em,
        dias_restantes: r?.anuncio?.dias_restantes,
        promovido_em: r?.anuncio?.promovido_em,
      })) : [];
      setAds(list);
      setError(null);
    } catch (e: any) {
      setError('Erro ao buscar anúncios');
      setAds([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAds(); }, [token]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ads.filter(a => !s || (a.titulo || '').toLowerCase().includes(s) || (a.produto?.nome || '').toLowerCase().includes(s));
  }, [ads, search]);

  const renderItem = ({ item }: { item: MyAd }) => {
    const img = normalizeImageUrl(item?.produto?.capa);
    return (
      <View className="bg-white p-3 rounded-lg border border-gray-200">
        <View className="flex-row gap-3" style={{ height: 96 }}>
          <Image source={{ uri: img }} style={{ width: 96, height: '100%', borderRadius: 10, backgroundColor: '#F3F4F6' }} resizeMode="cover" />
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{item.titulo || item.produto?.nome || '—'}</Text>
              <Text className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{item.tipo_anuncio || '—'}</Text>
            </View>
            <View className="mt-1.5">
              <Text className="text-[13px] text-gray-700" numberOfLines={2}>{item.descricao || '—'}</Text>
              {!!item.dias_restantes && <Text className="text-[12px] text-gray-500 mt-0.5">Expira em {item.dias_restantes} dia(s)</Text>}
            </View>
            <View className="flex-row gap-2 mt-2.5">
              <TouchableOpacity className="py-2 px-3 rounded-full border border-green-600 bg-green-100">
                <Text className="font-bold text-green-700">Ver Produto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between bg-violet-600 px-3 py-3">
        <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Meus Anúncios</Text>
        <View style={{ width: 32 }} />
      </View>

      <View className="p-3" style={{ gap: 8 }}>
        <View className="flex-row items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Pesquisar anúncios..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-gray-900 py-1"
          />
        </View>
      </View>

      <View className="flex-1 px-3 pb-4">
        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : error ? (
          <Text className="text-red-600">{error}</Text>
        ) : filtered.length === 0 ? (
          <View className="items-center justify-center py-10">
            <Ionicons name="image-outline" size={40} color="#9CA3AF" />
            <Text className="text-gray-500 mt-2">Sem anúncios</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(it) => String(it.id)}
            renderItem={renderItem}
            contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function normalizeImageUrl(url?: string | null) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'https://via.placeholder.com/160x160?text=Anuncio';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = BASE_URL?.replace(/\/$/, '') || '';
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}


