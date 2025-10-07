import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { getJson, putMultipart, BASE_URL, postJson, putJson } from '@/services/api';
import PostCard from '@/components/feed/items/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos básicos
interface Profile {
  id?: number;
  username?: string;
  name?: string;
  email?: string;
  perfil?: string; // avatar URL
  foto_perfil?: string;
  total_produtos?: number;
  total_seguidores?: number;
  total_seguindo?: number;
  pro?: boolean;
  is_pro?: boolean;
  conta_pro?: boolean;
  produtos?: any[];
  revisao?: string; // 'sim' | 'nao' | 'pendente'
  revisado?: string; // alias vindo do backend/web
}

function isPro(u?: Profile) {
  return !!(u?.pro || u?.is_pro || u?.conta_pro);
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const username = (params.username as string) || '';
  const { user, token, isAuthenticated } = useAuth();
  
  // Debug: Verificar estado da autenticação
  console.log('🔍 Estado da autenticação:', {
    isAuthenticated,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    username: user?.username
  });
  
  // Verificar token diretamente no AsyncStorage (como a web faz com localStorage)
  useEffect(() => {
    const checkAsyncStorage = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        console.log('🔍 Token no AsyncStorage:', storedToken ? 'Presente' : 'Ausente');
        if (storedToken) {
          console.log('🔍 Token AsyncStorage (primeiros 20 chars):', storedToken.substring(0, 20) + '...');
        }
      } catch (error) {
        console.log('❌ Erro ao verificar AsyncStorage:', error);
      }
    };
    checkAsyncStorage();
  }, []);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsPage, setPostsPage] = useState<number>(1);
  const [postsHasMore, setPostsHasMore] = useState<boolean>(true);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [tab, setTab] = useState<'produtos' | 'publicacoes' | 'seguidores'>('produtos');
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPendingInfo, setShowPendingInfo] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuItem, setMenuItem] = useState<any | null>(null);
  const pagerRef = useRef<ScrollView | null>(null);
  const screenWidth = Dimensions.get('window').width;

  // Carregar perfil e dados relacionados
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!username) return;
      setLoading(true);
      
      // Verificar se é o próprio perfil do usuário
      if (user && user.username === username) {
        console.log('Carregando perfil próprio:', username);
        setIsMyProfile(true);
        setProfile(user);
        
        // Carregar produtos do usuário
        try {
          const response = await getJson<any>(`/usuario/${username}/produtos`);
          if (response && response.produtos) {
            setProducts(response.produtos);
          }
        } catch (error) {
          console.error('Erro ao carregar produtos:', error);
        }
      } else {
        // Carregar perfil de outro usuário
        console.log('Carregando perfil de outro usuário:', username);
        try {
          const p = await getJson<Profile>(`/usuario/perfil/user/${username}`);
          if (!mounted) return;
          setProfile(p);
          setIsMyProfile(false);
          
          // Produtos podem vir no payload; se não, buscar em endpoint de produtos
          if (Array.isArray(p?.produtos) && p?.produtos.length) {
            setProducts(p!.produtos);
          } else {
            try {
              const pr = await getJson<any>(`/usuario/${username}/produtos`);
              const list = pr?.produtos || pr?.data?.produtos || [];
              setProducts(Array.isArray(list) ? list : []);
            } catch (e) {
              setProducts([]);
            }
          }
        } catch (e) {
          setProfile(null);
          setProducts([]);
        }
      }
      
      if (mounted) {
        setLoading(false);
      }
    }

    load();
    return () => { mounted = false };
  }, [username, user]);

  // Carregar publicações do usuário (filtra por autor no cliente)
  const fetchUserPosts = useCallback(async (reset = false) => {
    if (!profile?.username) return;
    if (postsLoading) return;
    try {
      setPostsLoading(true);
      const page = reset ? 1 : postsPage;
      const perPage = 20;
      // Se for meu perfil e tenho token, usar rota segura "minhas" para obter liked correto
      const endpoint = isMyProfile && token
        ? `/publicacoes/minhas?page=${page}&per_page=${perPage}`
        : `/publicacoes/listar?page=${page}&per_page=${perPage}`;
      const headers = isMyProfile && token ? { headers: { Authorization: `Bearer ${token}` } } : undefined as any;
      const resp: any = await getJson(endpoint, headers);
      const list = Array.isArray(resp?.publicacoes) ? resp.publicacoes : [];
      // Support both shapes: { usuario: {...} } and { publicador: {...} }
      const filtered = list.filter((p: any) => {
        const author = p?.usuario || p?.publicador || {};
        const authorUsername = (author?.username || '').toLowerCase();
        const authorId = author?.id;
        const byUsername = authorUsername && authorUsername === profile.username?.toLowerCase();
        const byId = typeof authorId === 'number' && typeof profile?.id === 'number' && authorId === profile.id;
        return byUsername || byId;
      });
      const mapped = filtered.map((p: any) => {
        const author = p?.usuario || p?.publicador || {};
        const likes = p.likes_count ?? p.total_likes ?? 0;
        const deu_like = (typeof p.liked === 'boolean' ? p.liked : undefined) ?? (typeof p.deu_like === 'boolean' ? p.deu_like : undefined) ?? false;
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
          tipo: undefined,
          conta_pro: undefined,
          is_following: undefined,
        },
      };
      });

      setPosts(prev => reset ? mapped : [...prev, ...mapped]);
      const total = Number(resp?.total || 0);
      const nextPage = page + 1;
      const totalPages = Number(resp?.total_pages || 1);
      setPostsHasMore(nextPage <= totalPages);
      setPostsPage(nextPage);
    } catch (e) {
      setPostsHasMore(false);
    } finally {
      setPostsLoading(false);
    }
  }, [profile?.username, postsLoading, postsPage]);

  useEffect(() => {
    // Reset posts when username changes
    setPosts([]);
    setPostsPage(1);
    setPostsHasMore(true);
    if (tab === 'publicacoes') fetchUserPosts(true);
  }, [profile?.username]);

  useEffect(() => {
    if (tab === 'publicacoes' && posts.length === 0 && !postsLoading) {
      fetchUserPosts(true);
    }
  }, [tab]);

  // Ações de produto no perfil (somente meu perfil)
  const updateProductInState = (predicate: (p: any) => boolean, updater: (p: any) => any) => {
    setProducts(prev => prev.map(p => (predicate(p) ? updater(p) : p)));
  };

  const toggleAutoRenovacaoProfile = async (p: any, enable: boolean) => {
    if (!token || !isMyProfile) return;
    try {
      await putJson(`/produtos/${p.id}/autorenovacao?autorenovacao=${enable}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updateProductInState(x => x.id === p.id, x => ({ ...x, autorenovacao: enable, auto_renovacao: enable, autoRenew: enable }));
      Alert.alert('Sucesso', enable ? 'Autorrenovação ativada' : 'Autorrenovação desativada');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao atualizar autorrenovação');
    }
  };

  const tornarNegociavelProfile = async (p: any) => {
    if (!token || !isMyProfile) return;
    try {
      await putJson(`/produtos/${p.id}/negociavel?negociavel=true`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Sucesso', 'Produto marcado como negociável');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao tornar negociável');
    }
  };

  const avatar = useMemo(() => {
    return (
      profile?.perfil || profile?.foto_perfil || '/avatar.png'
    );
  }, [profile]);

  // Função para mudar foto do perfil
  const handleChangePhoto = async () => {
    if (!isMyProfile) return;
    
    // Verificar autenticação primeiro
    if (!isAuthenticated || !token) {
      console.log('🔐 Usuário não está logado');
      Alert.alert('Login Necessário', 'Você precisa fazer login para atualizar o perfil.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fazer Login', onPress: () => router.push('/login') }
      ]);
      return;
    }
    
    console.log('🔑 Usuário autenticado, token presente');
    
    // Testar conectividade antes de prosseguir
    try {
      console.log('🌐 Testando conectividade...');
      await fetch('https://www.google.com', { 
        method: 'HEAD'
      });
      console.log('✅ Conectividade OK');
    } catch (error) {
      console.log('❌ Problema de conectividade detectado');
      Alert.alert('Erro de Conexão', 'Verifique sua conexão com a internet e tente novamente.');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

              if (!result.canceled && result.assets[0]) {
          setUploading(true);
          
          const formData = new FormData();
          formData.append('file', {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: 'profile.jpg',
          } as any);

        try {
          console.log('🌐 Fazendo requisição para atualizar foto...');
          console.log('🔗 URL:', '/info_usuario/perfil');
          console.log('🔑 Token de autenticação:', token ? 'Presente' : 'Ausente');
          console.log('📦 FormData preparado para envio');
          
          // Verificar se tem token
          if (!token) {
            throw new Error('Token de autenticação não encontrado');
          }
          
          console.log('🔑 Token sendo usado:', token.substring(0, 20) + '...');
          
          const response = await putMultipart('/info_usuario/perfil', formData);
          console.log('✅ Foto atualizada com sucesso:', response);
          
          Alert.alert('Sucesso!', 'Foto do perfil atualizada com sucesso!');
          
          // Atualizar o perfil local
          setProfile(prev => prev ? {
            ...prev,
            perfil: result.assets[0].uri
          } : null);
        } catch (error: any) {
          console.error('❌ Erro ao atualizar foto:', error);
          
          let errorMessage = 'Não foi possível atualizar a foto. Tente novamente.';
          
          if (error.message === 'Token de autenticação não encontrado') {
            errorMessage = 'Você precisa fazer login para atualizar o perfil.';
          } else if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
            errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          } else if (error.response?.status === 401) {
            errorMessage = 'Você precisa fazer login para atualizar o perfil.';
          } else if (error.response?.status === 422) {
            errorMessage = 'Formato de imagem inválido. Tente outra foto.';
          } else if (error.response?.status === 500) {
            errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
          } else if (error.message?.includes('timeout')) {
            errorMessage = 'Tempo limite excedido. Verifique sua conexão e tente novamente.';
          }
          
          Alert.alert('Erro', errorMessage);
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível acessar a galeria.');
    }
  };

  if (!username) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-base text-gray-600">Informe um username para visualizar o perfil.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="border-b border-gray-200">
          <View className="flex-row items-center justify-between p-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="font-semibold text-gray-900">Perfil</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4F46E5" />
          <Text className="mt-3 text-gray-500">Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="border-b border-gray-200">
          <View className="flex-row items-center justify-between p-4">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="font-semibold text-gray-900">Perfil</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="information-circle-outline" size={42} color="#6B7280" />
          <Text className="mt-2 text-xl font-semibold text-gray-900">Perfil não está disponível</Text>
          <Text className="mt-1 text-center text-gray-600">A ligação pode não estar a funcionar ou o perfil pode ter sido removido.</Text>
          <TouchableOpacity onPress={() => router.replace('/')} className="mt-4 bg-violet-500 px-4 py-2 rounded-md">
            <Text className="text-white font-semibold">Ver mais na SkyVenda MZ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="font-semibold text-gray-900">@{profile?.username}</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="settings-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Capa simples */}
        <View className="h-28 w-full bg-violet-100" />

        {/* Avatar + Nome + Ações */}
        <View className="-mt-10 items-center px-4">
          <TouchableOpacity 
            onPress={handleChangePhoto}
            disabled={!isMyProfile || uploading}
            style={{ opacity: uploading ? 0.7 : 1 }}
          >
            <View style={{ position: 'relative' }}>
              <Image
                source={{ uri: avatar }}
                style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'white' }}
                contentFit="cover"
              />
              {uploading && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: 60,
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <ActivityIndicator color="#8B5CF6" size="large" />
                </View>
              )}
              {isMyProfile && !uploading && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#8B5CF6',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: 'white'
                }}>
                  <Feather name="camera" size={16} color="white" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View className="items-center mt-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-semibold text-gray-900">{profile?.name || profile?.username}</Text>
              {isPro(profile) && <MaterialIcons name="verified" size={18} color="#0EA5E9" />}
              {isMyProfile && (
                <View style={{
                  backgroundColor: '#8B5CF6',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>EU</Text>
                </View>
              )}
            </View>
            {!!profile?.email && <Text className="text-gray-500">{profile.email}</Text>}
            {isMyProfile && (
              <Text className="text-xs text-violet-600 mt-1">Toque na foto para alterá-la</Text>
            )}
            {isMyProfile && (profile?.revisao !== 'sim' && profile?.revisado !== 'sim') && (
              <View className="mt-3 items-center">
                {(profile?.revisao === 'pendente' || profile?.revisado === 'pendente') ? (
                  <TouchableOpacity onPress={() => setShowPendingInfo(true)}>
                    <Text className="text-xs text-amber-600">Sua verificação está em análise</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="mt-2 bg-amber-500 px-4 py-2 rounded-md"
                    onPress={() => router.push('/verificacao')}
                  >
                    <Text className="text-white font-semibold">Enviar verificação</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View className="flex-row gap-2 mt-4">
            {isMyProfile ? (
              // Botões para o próprio perfil
              <>
                <TouchableOpacity 
                  className="bg-violet-600 px-4 py-2 rounded-md"
                  onPress={() => router.push('/accounts/edit')}
                >
                  <Text className="text-white font-semibold">Editar Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-gray-200 px-4 py-2 rounded-md">
                  <Text className="text-gray-800">Ver Publicações</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Botões para perfil de outro usuário
              <>
                <TouchableOpacity 
                  className="bg-violet-600 px-4 py-2 rounded-md" 
                  onPress={() => router.push({ pathname: '/(chat)/[chatId]', params: { chatId: String(profile.id || username) } })}
                >
                  <Text className="text-white font-semibold">Mensagem</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-gray-200 px-4 py-2 rounded-md">
                  <Text className="text-gray-800">Seguir</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Métricas */}
        <View className="mt-6 flex-row justify-around px-6">
          <View className="items-center">
            <Text className="text-gray-500">Publicações</Text>
            <Text className="text-lg font-semibold">{profile?.total_produtos ?? 0}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500">Seguidores</Text>
            <Text className="text-lg font-semibold">{profile?.total_seguidores ?? 0}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500">A seguir</Text>
            <Text className="text-lg font-semibold">{profile?.total_seguindo ?? 0}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mt-8 border-b border-gray-200 px-4">
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={() => { setTab('produtos'); pagerRef.current?.scrollTo({ x: 0, animated: true }); }}>
              <Text className={`pb-2 ${tab === 'produtos' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Produtos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setTab('publicacoes'); pagerRef.current?.scrollTo({ x: screenWidth, animated: true }); }}>
              <Text className={`pb-2 ${tab === 'publicacoes' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Publicações</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setTab('seguidores'); pagerRef.current?.scrollTo({ x: screenWidth * 2, animated: true }); }}>
              <Text className={`pb-2 ${tab === 'seguidores' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Seguidores</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conteúdo com pager deslizável */}
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            const nextTab = index === 0 ? 'produtos' : index === 1 ? 'publicacoes' : 'seguidores';
            setTab(nextTab);
            if (nextTab === 'publicacoes' && posts.length === 0 && !postsLoading) {
              fetchUserPosts(true);
            }
          }}
          contentContainerStyle={{ flexGrow: 1 }}
          style={{ marginTop: 16 }}
        >
          {/* Página 1: Produtos */}
          <View style={{ width: screenWidth }} className="px-4">
            <View className="gap-3">
              {products?.length ? (
                products.map((item: any, idx) => (
                  <View key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                    <View className="flex-row gap-3" style={{ height: 96 }}>
                      <Image
                        source={{ uri: normalizeImageUrl(item?.thumb || item?.imagem || item?.image as string) }}
                        style={{ width: 96, height: '100%', borderRadius: 10, backgroundColor: '#F3F4F6' }}
                        contentFit="cover"
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-base font-bold text-gray-900" numberOfLines={1}>{item?.title || item?.nome || '—'}</Text>
                          <Text className="text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{Boolean(item?.ativo ?? item?.active) ? 'Ativo' : 'Inativo'}</Text>
                        </View>
                        <View className="mt-1.5">
                          <Text className="text-[13px] text-gray-700">Preço: {typeof item?.price === 'number' ? fmtMZN(item.price) : (typeof item?.preco === 'number' ? fmtMZN(item.preco) : '—')}</Text>
                          <Text className="text-[13px] text-gray-700">Estoque: {getStockProfile(item)}</Text>
                        </View>
                        <View className="flex-row items-center justify-between mt-2.5">
                          <View className="flex-row gap-3">
                            <Text className="text-[12px] text-gray-500">👁️ {toNum(item?.views)}</Text>
                            <Text className="text-[12px] text-gray-500">💬 {Array.isArray(item?.comments) ? item.comments.length : 0}</Text>
                            <Text className="text-[12px] text-gray-500">❤️ {toNum(item?.likes)}</Text>
                          </View>
                          {isMyProfile && (
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
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-gray-500">Sem produtos ainda.</Text>
              )}
            </View>
          </View>

          {/* Página 2: Publicações */}
          <View style={{ width: screenWidth }} className="px-4">
            <View>
              {posts.length === 0 && postsLoading ? (
                <View className="items-center py-10">
                  <ActivityIndicator color="#4F46E5" />
                  <Text className="mt-2 text-gray-500">Carregando publicações…</Text>
                </View>
              ) : posts.length === 0 ? (
                <View className="items-center py-10">
                  <Ionicons name="document-text-outline" size={36} color="#9CA3AF" />
                  <Text className="mt-2 text-gray-500">Sem publicações.</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {posts.map((p) => (
                    <PostCard key={`post-${p.id}`} data={p} />
                  ))}
                  {postsHasMore && !postsLoading && (
                    <TouchableOpacity
                      className="mt-2 bg-gray-100 py-2 rounded-md items-center"
                      onPress={() => fetchUserPosts(false)}
                    >
                      <Text className="text-gray-700">Carregar mais</Text>
                    </TouchableOpacity>
                  )}
                  {postsLoading && (
                    <View className="py-3 items-center">
                      <ActivityIndicator color="#4F46E5" />
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Página 3: Seguidores */}
          <View style={{ width: screenWidth }} className="px-4">
            <View className="items-center py-10">
              <Ionicons name="people-outline" size={36} color="#9CA3AF" />
              <Text className="mt-2 text-gray-500">Seguidores em breve</Text>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Menu de ações (somente meu perfil) */}
      {isMyProfile && (
        <View>
          {menuVisible && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} activeOpacity={1} onPress={() => setMenuVisible(false)} />
              <View style={{ position: 'absolute', left: 16, right: 16, bottom: 20, backgroundColor: 'white', borderRadius: 16, padding: 12 }}>
                <MenuBtn label="Editar" onPress={() => { if (menuItem) router.push({ pathname: '/produtos/editar/[slug]', params: { slug: menuItem.slug } }); setMenuVisible(false); }} />
                <MenuBtn label="Turbinar a bolada" onPress={() => { if (menuItem) router.push({ pathname: '/produtos/anunciar/[id]', params: { id: String(menuItem.id) } }); setMenuVisible(false); }} />
                <MenuBtn label="Ativar autorenovação" onPress={() => { if (menuItem) toggleAutoRenovacaoProfile(menuItem, true); setMenuVisible(false); }} />
                <MenuBtn label="Tornar Negociável" onPress={() => { if (menuItem) tornarNegociavelProfile(menuItem); setMenuVisible(false); }} />
                <MenuBtn label="Excluir" destructive onPress={() => { /* implementar se necessário */ setMenuVisible(false); }} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Dialog de status pendente */}
      {showPendingInfo && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View className="absolute left-4 right-4 top-1/4 bg-white rounded-lg p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-semibold text-gray-900">Verificação pendente</Text>
              <TouchableOpacity onPress={() => setShowPendingInfo(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-700">
              Olá {profile?.name || profile?.username}, a sua verificação está sendo revisada. Você receberá uma notificação quando estiver concluída e sua conta for verificada.
            </Text>
            <View className="mt-2 bg-blue-50 p-3 rounded-md border border-blue-200">
              <Text className="text-blue-800">Obrigado por enviar os seus documentos. O processo pode levar algum tempo.</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPendingInfo(false)} className="mt-4 bg-violet-600 px-4 py-3 rounded-md items-center">
              <Text className="text-white font-semibold">Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
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

function getStockProfile(p: any) {
  const a = p?.stock;
  const b = p?.stock_quantity;
  const v = typeof a === 'number' ? a : (typeof b === 'number' ? b : Number(b));
  return Number.isFinite(v) ? v : '—';
}

function toNum(v: any) {
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function MenuBtn({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} className="py-3">
      <Text className={`${destructive ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function fmtMZN(value?: number) {
  if (typeof value !== 'number') return '—';
  try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value}`; }
}

