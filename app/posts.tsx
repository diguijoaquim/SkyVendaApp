import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJson } from '@/services/api';
import PostCard from '@/components/feed/items/PostCard';
import { useAuth } from '@/contexts/AuthContext';

export default function PostsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const myUsername = useMemo(() => (user?.username || '').toLowerCase(), [user?.username]);
  const myId = user?.id;

  const fetchMyPosts = useCallback(async (reset = false) => {
    if (!token) return;
    if (loading) return;
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      const perPage = 20;
      const resp: any = await getJson(`/publicacoes/minhas?page=${currentPage}&per_page=${perPage}`, { headers: { Authorization: `Bearer ${token}` } });
      const list = Array.isArray(resp?.publicacoes) ? resp.publicacoes : [];
      const mapped = list.map((p: any) => {
        const author = p?.usuario || {};
        const likes = p.likes_count ?? 0;
        const deu_like = typeof p.liked === 'boolean' ? p.liked : false;
        const time = p.tempo || p.data_criacao || '';
        return {
          id: p.id,
          content: p.conteudo,
          gradient_style: p.gradient_style || 'default',
          time,
          likes: Number(likes || 0),
          liked: Boolean(deu_like),
          user: {
            id: author?.id,
            name: author?.nome || author?.username,
            username: author?.username,
            avatar: author?.foto_perfil || null,
          },
        };
      });

      setPosts(prev => reset ? mapped : [...prev, ...mapped]);
      const totalPages = Number(resp?.total_pages || 1);
      const nextPage = currentPage + 1;
      setHasMore(nextPage <= totalPages);
      setPage(nextPage);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [token, loading, page]);

  useEffect(() => {
    // rota segura: exigir token
    if (!token) {
      router.replace('/login');
      return;
    }
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchMyPosts(true);
  }, [myUsername, myId, token]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="font-semibold text-gray-900">Minhas Publicações</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {posts.length === 0 && loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#4F46E5" />
            <Text className="mt-2 text-gray-500">Carregando publicações…</Text>
          </View>
        ) : posts.length === 0 ? (
          <View className="items-center py-10">
            <Ionicons name="document-text-outline" size={36} color="#9CA3AF" />
            <Text className="mt-2 text-gray-500">Você ainda não publicou.</Text>
          </View>
        ) : (
          <View className="gap-3">
            {posts.map((p) => (
              <PostCard key={`post-${p.id}`} data={p} />
            ))}
            {hasMore && !loading && (
              <TouchableOpacity
                className="mt-2 bg-gray-100 py-2 rounded-md items-center"
                onPress={() => fetchMyPosts(false)}
              >
                <Text className="text-gray-700">Carregar mais</Text>
              </TouchableOpacity>
            )}
            {loading && posts.length > 0 && (
              <View className="py-3 items-center">
                <ActivityIndicator color="#4F46E5" />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}