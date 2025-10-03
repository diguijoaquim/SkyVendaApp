import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { getJson, putMultipart } from '@/services/api';
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
  const [tab, setTab] = useState<'produtos' | 'publicacoes' | 'seguidores'>('produtos');
  const [isMyProfile, setIsMyProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

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
            <TouchableOpacity onPress={() => setTab('produtos')}>
              <Text className={`pb-2 ${tab === 'produtos' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Produtos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('publicacoes')}>
              <Text className={`pb-2 ${tab === 'publicacoes' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Publicações</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('seguidores')}>
              <Text className={`pb-2 ${tab === 'seguidores' ? 'font-bold text-gray-900' : 'text-gray-500'}`}>Seguidores</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Conteúdo das tabs */}
        <View className="px-4 mt-4">
          {tab === 'produtos' && (
            <View className="gap-3">
              {products?.length ? (
                products.map((p, idx) => (
                  <View key={idx} className="flex-row gap-3 p-3 rounded-lg border border-gray-100">
                    <Image source={{ uri: p?.capa || p?.imagem || p?.image || 'https://via.placeholder.com/160' }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="cover" />
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-900" numberOfLines={2}>{p?.nome || p?.titulo || 'Produto'}</Text>
                      {!!p?.preco && <Text className="mt-1 text-violet-600 font-bold">{String(p.preco)} MT</Text>}
                      {!!p?.descricao && <Text className="mt-1 text-gray-600" numberOfLines={2}>{p.descricao}</Text>}
                      <View className="flex-row items-center mt-1">
                        {!!p?.time && (
                          <Text className="text-xs text-gray-500">{p.time}</Text>
                        )}
                        {!!p?.views && (
                          <Text className="text-xs text-gray-500">{p?.time ? ' • ' : ''}{p.views} visualizações</Text>
                        )}
                        {typeof p?.total_comentarios === 'number' && (
                          <Text className="text-xs text-gray-500">{(p?.time || p?.views) ? ' • ' : ''}{p.total_comentarios} comentários</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-gray-500">Sem produtos ainda.</Text>
              )}
            </View>
          )}

          {tab === 'publicacoes' && (
            <View className="items-center py-10">
              <Ionicons name="document-text-outline" size={36} color="#9CA3AF" />
              <Text className="mt-2 text-gray-500">Publicações em breve</Text>
            </View>
          )}

          {tab === 'seguidores' && (
            <View className="items-center py-10">
              <Ionicons name="people-outline" size={36} color="#9CA3AF" />
              <Text className="mt-2 text-gray-500">Seguidores em breve</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
