import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getJson, postJson, postFormUrlEncoded } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useHome } from '@/contexts';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
type PostUser = {
  id: number;
  nome?: string;
  username?: string;
  foto_perfil?: string | null;
};

type PostComment = {
  id: number;
  conteudo: string;
  data_criacao?: string;
  usuario: PostUser;
};

type PostDetail = {
  id: number;
  conteudo: string;
  gradient_style?: string;
  data_criacao?: string;
  usuario: PostUser;
  deu_like?: boolean; // if present
  likes?: number; // total count
  comentarios?: PostComment[];
};

function getGradientColors(style?: string): string[] {
  const gradients: Record<string, string[]> = {
    'bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600': ['#DB2777', '#9333EA', '#2563EB'],
    'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500': ['#10B981', '#14B8A6', '#3B82F6'],
    'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500': ['#F97316', '#EF4444', '#EC4899'],
    'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500': ['#3B82F6', '#06B6D4', '#14B8A6'],
    'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500': ['#A855F7', '#EC4899', '#EF4444'],
    purple: ['#8B5CF6', '#A855F7'],
    blue: ['#3B82F6', '#1D4ED8'],
    green: ['#10B981', '#059669'],
    pink: ['#EC4899', '#BE185D'],
    orange: ['#F59E0B', '#D97706'],
    red: ['#EF4444', '#DC2626'],
    default: ['#6B7280', '#4B5563'],
  };
  if (style && gradients[style]) return gradients[style];
  return gradients.default;
}

export default function PostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const postId = useMemo(() => Number(params?.id || ''), [params]);
  const { token, isAuthenticated, user } = useAuth() as any;
  const { getPostByIdFromCache, upsertPostDetailById, updatePostLike, appendPostComment } = useHome() as any;
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) {
      setError('ID da publicação inválido');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      // Try cache first
      const cached = getPostByIdFromCache?.(postId);
      if (cached) {
        setPost(cached);
        setLoading(false);
        return;
      }
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const res = await getJson<PostDetail>(`/publicacoes/${postId}`, headers as any);
      const normalized: PostDetail = {
        id: (res as any).id,
        conteudo: (res as any).conteudo || (res as any).content,
        gradient_style: (res as any).gradient_style,
        data_criacao: (res as any).data_criacao,
        usuario: (res as any).usuario,
        deu_like: (res as any).deu_like ?? (res as any).liked ?? false,
        likes: (res as any).likes ?? (res as any).likes_count ?? 0,
        comentarios: (res as any).comentarios ?? [],
      };
      setPost(normalized);
      upsertPostDetailById?.(normalized);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar publicação');
    } finally {
      setLoading(false);
    }
  }, [postId, token, getPostByIdFromCache, upsertPostDetailById]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const toggleLike = useCallback(async () => {
    if (!post || likeBusy) return;
    if (!isAuthenticated || !token) {
      Alert.alert('Atenção', 'Precisa fazer login para curtir publicações');
      router.push('/login');
      return;
    }
    try {
      setLikeBusy(true);
      // optimistic
      const optimistic = {
        ...post,
        deu_like: !post.deu_like,
        likes: (post.likes || 0) + (post.deu_like ? -1 : 1),
      } as PostDetail;
      setPost(optimistic);
      updatePostLike?.(post.id, optimistic.deu_like, optimistic.likes);
      await postJson(`/publicacoes/${post.id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      // rollback simple
      setPost(p => (p ? { ...p, deu_like: !p.deu_like, likes: (p.likes || 0) + (p.deu_like ? -1 : 1) } : p));
      updatePostLike?.(post.id, post.deu_like!, post.likes);
      Alert.alert('Erro', 'Não foi possível curtir a publicação');
    } finally {
      setLikeBusy(false);
    }
  }, [post, likeBusy, isAuthenticated, token, router, updatePostLike]);

  const sendComment = useCallback(async () => {
    if (!post) return;
    if (!isAuthenticated || !token) {
      Alert.alert('Atenção', 'Precisa fazer login para comentar');
      router.push('/login');
      return;
    }
    const text = comment.trim();
    if (!text) return;
    try {
      setIsCommenting(true);
      // optimistic append
      const optimisticComment: PostComment = {
        id: Math.floor(Math.random() * 1e9),
        conteudo: text,
        data_criacao: 'agora mesmo',
        usuario: { id: 0, nome: 'Você' },
      } as any;
      setPost(p => (p ? { ...p, comentarios: [ ...(p.comentarios || []), optimisticComment ] } : p));
      appendPostComment?.(post.id, optimisticComment);

      const params = new URLSearchParams();
      params.append('conteudo', text);
      await postFormUrlEncoded(`/publicacoes/${post.id}/comentarios`, params, { headers: { Authorization: `Bearer ${token}` } });
      setComment('');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível comentar');
    } finally {
      setIsCommenting(false);
    }
  }, [post, comment, isAuthenticated, token, router, appendPostComment]);

  if (loading) {
    return (
      <SafeAreaView className='flex-1 bg-white'>
        {/* Header skeleton */}
        <View className='flex-row items-center justify-between border-b border-gray-300 px-4 py-3'>
          <View style={{ width: 32, height: 24, backgroundColor: '#E5E7EB', borderRadius: 6 }} />
          <View style={{ flex: 1, marginLeft: 12, height: 18, backgroundColor: '#E5E7EB', borderRadius: 6 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: (50 + (insets?.bottom || 0)) + 16, flexGrow: 1 }} showsVerticalScrollIndicator>
          {/* User header skeleton */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <View style={{ height: 14, backgroundColor: '#E5E7EB', borderRadius: 6, width: '60%', marginBottom: 6 }} />
              <View style={{ height: 12, backgroundColor: '#F3F4F6', borderRadius: 6, width: '40%' }} />
            </View>
          </View>

          {/* Gradient block placeholder */}
          <View style={{ minHeight: 220, marginHorizontal: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 }}>
            <View style={{ height: 100, width: '90%', backgroundColor: '#E5E7EB', borderRadius: 12 }} />
          </View>

          {/* Actions skeleton */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
            <View style={{ width: 24, height: 24, backgroundColor: '#E5E7EB', borderRadius: 6, marginRight: 16 }} />
            <View style={{ width: 28, height: 14, backgroundColor: '#F3F4F6', borderRadius: 6, marginRight: 16 }} />
            <View style={{ width: 24, height: 24, backgroundColor: '#E5E7EB', borderRadius: 6, marginRight: 16 }} />
            <View style={{ width: 24, height: 24, backgroundColor: '#E5E7EB', borderRadius: 6 }} />
          </View>

          {/* Comments container skeleton */}
          <View style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#F9FAFB', paddingHorizontal: 12 }}>
            <View style={{ paddingVertical: 12 }}>
              <View style={{ height: 14, width: 120, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 12 }} />

              {[...Array(3)].map((_, i) => (
                <View key={`skeleton-c-${i}`} style={{ backgroundColor: '#F3F4F6', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, width: '100%' }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ height: 12, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 6 }} />
                    <View style={{ height: 12, width: '80%', backgroundColor: '#E5E7EB', borderRadius: 6 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom input bar skeleton (disabled) */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 + (insets?.bottom || 0), borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: (insets?.bottom || 0) }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F3F4F6', height: 36 }} />
          <View style={{ width: 48, height: 36, backgroundColor: '#E5E7EB', borderRadius: 10 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ color: '#DC2626', marginBottom: 12, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity onPress={fetchPost} style={{ backgroundColor: '#7C3AED', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!post) return null;

  return (
    <SafeAreaView className='flex-1 bg-white'>
      {/* Top Header */}
      <View className='flex-row items-center justify-between border-b border-gray-300 px-4 py-3'>
        <TouchableOpacity onPress={() => router.back()} className='p-2 '>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '700', color: '#111827' }} numberOfLines={1}>
          Publicação de {post.usuario?.username || post.usuario?.nome || 'usuário'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: (50 + (insets?.bottom || 0)) + 16, flexGrow: 1 }} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {/* User Header (second) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => {
              const username = post?.usuario?.username;
              if (username) {
                router.push({ pathname: '/(profile)/[username]', params: { username: String(username) } });
              } else {
                Alert.alert('Perfil', 'Username indisponível para este autor.');
              }
            }}
          >
            <Image source={{ uri: post.usuario?.foto_perfil || 'https://via.placeholder.com/40x40?text=U' }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6' }} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{post.usuario?.nome || post.usuario?.username || 'Usuário'}</Text>
              {!!post.data_criacao && <Text style={{ fontSize: 12, color: '#6B7280' }}>{post.data_criacao}</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Post gradient content (third) */}
        <LinearGradient
          colors={getGradientColors(post.gradient_style) as any}
          style={{ borderRadius: 0, padding: 24, marginBottom: 16, minHeight: 250, maxHeight: 320, justifyContent: 'center', alignItems: 'center' }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 26 }}>{post.conteudo}</Text>
        </LinearGradient>

        {/* Action bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={toggleLike} disabled={likeBusy} style={{ marginRight: 16, padding: 4 }}>
              <Ionicons name={post.deu_like ? 'heart' : 'heart-outline'} size={24} color={post.deu_like ? '#EF4444' : '#374151'} />
            </TouchableOpacity>
            <Text style={{ marginRight: 16, fontSize: 14, color: '#6B7280', fontWeight: '500' }}>{post.likes || 0}</Text>
            <TouchableOpacity style={{ marginRight: 16, padding: 4 }}>
              <Ionicons name="chatbubble-outline" size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 4 }}>
              <Ionicons name="share-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Container (full width) */}
        <View style={{ marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: '#C4B5FD', borderRadius: 8, backgroundColor: '#F5F3FF', paddingHorizontal: 12 }}>
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 }}>
              <Text>{post.comentarios?.length || 0}</Text> Comentários
            </Text>
            <View style={{ gap: 8, marginBottom: 12, maxHeight: 420 }}>
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {(post.comentarios || []).map((c) => (
                  <View key={String(c.id)} style={{ backgroundColor: '#EDE9FE', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, width: '100%' }}>
                    <View style={{ width: 40, height: 40, borderRadius: 999, borderWidth: 2, overflow: 'hidden', borderColor: '#DDD6FE' }}>
                      <Image source={{ uri: c.usuario?.foto_perfil || 'https://via.placeholder.com/40x40?text=U' }} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontWeight: '700', color: '#6D28D9', fontSize: 13 }}>{c.usuario?.nome || c.usuario?.username || 'Usuário'}</Text>
                        {!!c.data_criacao && <Text style={{ color: '#6B7280', fontSize: 12 }}>{c.data_criacao}</Text>}
                      </View>
                      <Text style={{ color: '#4B5563', fontSize: 13 }}>{c.conteudo}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom comment input bar (50px) */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 50 + (insets?.bottom || 0), borderTopWidth: 1, borderTopColor: '#C4B5FD', backgroundColor: '#FFFFFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: (insets?.bottom || 0) }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F9FAFB' }}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={`Comentar como ${user?.username || 'usuário'}`}
            style={{ paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
            multiline={false}
          />
        </View>
        <TouchableOpacity onPress={sendComment} disabled={isCommenting || !comment.trim()} style={{ paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6', borderRadius: 10, opacity: isCommenting || !comment.trim() ? 0.6 : 1 }}>
          {isCommenting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
