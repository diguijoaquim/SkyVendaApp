import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useHome } from '@/contexts';
import { getJson } from '@/services/api';

interface Nhonguista {
  id: number;
  name: string;
  username: string;
  foto_perfil?: string;
  avaliacao_media?: number;
  seguidores?: number;
}

export default function MobileMenuScreen() {
  const { user, logout, isAuthenticated, token } = useAuth();
  const { myproducts, myorders, ensureMyOrdersLoaded, ensureMyProductsLoaded } = useHome();
  const router = useRouter();
  
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [nhonguistas, setNhonguistas] = useState<Nhonguista[]>([]);
  const [loadingNhonguistas, setLoadingNhonguistas] = useState(false);

  const goToMyProfile = () => {
    const uname = user?.username || user?.id_unico || '';
    if (!uname) return;
    router.push({ pathname: '/(profile)/[username]', params: { username: String(uname) } });
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      try {
        setLoadingOrders(true);
        setLoadingProducts(true);
        await Promise.all([
          ensureMyOrdersLoaded(token),
          ensureMyProductsLoaded(token),
        ]);
      } finally {
        setLoadingOrders(false);
        setLoadingProducts(false);
      }
    };
    run();
    
    // Buscar nhonguistas e lojas
    setLoadingNhonguistas(true);
    if (user?.id_unico) {
      getJson(`/usuario/usuarios/lojas?skip=0&limit=5&identificador_unico=${user?.id_unico}`)
        .then(res => {
          setNhonguistas(res.usuarios || []);
        })
        .catch(err => {
          console.error('Erro ao buscar nhonguistas:', err.message);
        })
        .finally(() => {
          setLoadingNhonguistas(false);
        });
    } else {
      setLoadingNhonguistas(false);
    }
  }, [token, user?.id_unico, ensureMyOrdersLoaded, ensureMyProductsLoaded]);

  // Update displayed counts when context arrays change
  useEffect(() => {
    setOrderCount(myorders?.length || 0);
  }, [myorders]);
  useEffect(() => {
    setProductCount(myproducts?.length || 0);
  }, [myproducts]);

  return (
    <View className="flex-1 bg-gradient-to-br from-pink-100 via-white to-red-50">
      {/* Fixed Header */}
      <View className="flex-row items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-red-50 shadow-sm">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-700">Menu</Text>
        </View>
        <TouchableOpacity className="p-2">
          <Ionicons name="search" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4" style={{ gap: 16 }}>
          {isAuthenticated ? (
            <>
              {/* Profile Section */}
              <View className="bg-white rounded-lg p-4 border border-gray-200">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity onPress={goToMyProfile} className="flex-row items-center gap-3">
                    <Image 
                      source={{ uri: user?.perfil || 'https://via.placeholder.com/40' }} 
                      className="w-10 h-10 rounded-full border border-gray-200"
                      style={{ width: 40, height: 40 }}
                    />
                    <View>
                      <Text className="font-semibold">{user?.username}</Text>
                      <Text className="text-sm text-gray-500">{user?.email}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setIsProfileExpanded(!isProfileExpanded)}
                    className="p-2 rounded-full bg-gray-100"
                    style={{ transform: [{ rotate: isProfileExpanded ? '180deg' : '0deg' }] }}
                  >
                    <Ionicons name="chevron-down" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Expandable Menu */}
                {isProfileExpanded && (
                  <View className="mt-4 border-t pt-4" style={{ gap: 12 }}>
                    <TouchableOpacity onPress={goToMyProfile} className="flex-row items-center gap-3 p-2">
                      <Ionicons name="person" size={20} color="#4B5563" />
                      <Text>Ver meu perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => logout()} 
                      className="flex-row items-center gap-3 p-2 w-full"
                    >
                      <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                      <Text className="text-red-600">Terminar sessão</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Nhonguistas e Lojas Section */}
              <View className="bg-white rounded-lg p-4 border border-gray-200" style={{ gap: 12 }}>
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-gray-700">Nhonguistas e Lojas</Text>
                  <TouchableOpacity onPress={() => router.push('/nhonguistas')}>
                    <Text className="text-sm text-violet-600">Ver todos</Text>
                  </TouchableOpacity>
                </View>
                
                {loadingNhonguistas ? (
                  <View style={{ gap: 12 }}>
                    {[1, 2, 3].map((_, index) => (
                      <View key={index} className="flex-row items-center gap-3">
                        <View className="w-12 h-12 bg-gray-200 rounded-full" />
                        <View className="flex-1" style={{ gap: 8 }}>
                          <View className="h-4 bg-gray-200 rounded w-3/4" />
                          <View className="h-3 bg-gray-200 rounded w-1/2" />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : nhonguistas.length > 0 ? (
                  <View style={{ gap: 16 }}>
                    {nhonguistas.map((nhonguista) => (
                      <TouchableOpacity 
                        key={nhonguista.id} 
                        onPress={() => router.push({ pathname: '/(profile)/[username]', params: { username: nhonguista.username } })}
                        className="flex-row items-center gap-3 p-2"
                      >
                        <Image 
                          source={{ uri: nhonguista.foto_perfil || 'https://via.placeholder.com/40' }} 
                          className="w-12 h-12 rounded-full border border-gray-200"
                          style={{ width: 48, height: 48 }}
                        />
                        <View className="flex-1">
                          <Text className="font-medium text-gray-800">{nhonguista.name}</Text>
                          <Text className="text-sm text-gray-500">@{nhonguista.username}</Text>
                        </View>
                        <View className="items-end">
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={16} color="#F59E0B" />
                            <Text className="text-sm ml-1 text-amber-500">{nhonguista.avaliacao_media || '0.0'}</Text>
                          </View>
                          <Text className="text-xs text-gray-500">{nhonguista.seguidores || 0} seguidores</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity 
                      onPress={() => router.push('/nhonguistas')}
                      className="w-full py-2"
                    >
                      <Text className="text-center text-violet-600 font-medium">Ver mais nhonguistas</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center py-6">
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 mt-3">Nenhum nhonguista encontrado</Text>
                    <TouchableOpacity onPress={() => router.push('/nhonguistas')} className="mt-2">
                      <Text className="text-violet-600 font-medium">Explorar nhonguistas</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Menu Items Grid */}
              <View className="flex-row flex-wrap -mx-1 pt-2">
                {loadingProducts ? (
                  <View className="basis-1/2 px-1 mb-2">
                    <View className="bg-violet-50 rounded-lg p-4 border border-violet-200 items-center">
                      <ActivityIndicator color="#4F46E5" />
                    </View>
                  </View>
                ) : (
                  <View className="basis-1/2 px-1 mb-2">
                    <TouchableOpacity 
                      onPress={() => router.push('/produtos')}
                      className="bg-violet-50 rounded-lg p-4 border border-violet-200 items-center"
                    >
                      <Text className="text-2xl font-bold text-blue-600">{productCount}</Text>
                      <Text className="text-sm text-gray-600">Produtos</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {loadingOrders ? (
                  <View className="basis-1/2 px-1 mb-2">
                    <View className="bg-pink-50 rounded-lg p-4 border border-pink-200 items-center">
                      <ActivityIndicator color="#EC4899" />
                    </View>
                  </View>
                ) : (
                  <View className="basis-1/2 px-1 mb-2">
                    <TouchableOpacity 
                      onPress={() => router.push('/pedidos')}
                      className="bg-pink-50 rounded-lg p-4 border border-pink-200 items-center"
                    >
                      <Text className="text-2xl font-bold text-pink-600">{orderCount}</Text>
                      <Text className="text-sm text-gray-600">Pedidos</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View className="basis-1/2 px-1 mb-2">
                  <TouchableOpacity 
                    onPress={() => router.push('/mensagens')}
                    className="bg-green-50 rounded-lg p-4 border border-green-200 items-center"
                  >
                    <Text className="text-2xl font-bold text-green-600">0</Text>
                    <Text className="text-sm text-gray-600">Mensagens</Text>
                  </TouchableOpacity>
                </View>

                <View className="basis-1/2 px-1 mb-2">
                  <TouchableOpacity 
                    onPress={() => router.push('/amigos')}
                    className="bg-purple-50 rounded-lg p-4 border border-purple-200 items-center"
                  >
                    <Text className="text-2xl font-bold text-purple-600">0</Text>
                    <Text className="text-sm text-gray-600">Amigos</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Navigation Section */}
              <View className="bg-white rounded-lg p-4 border border-gray-200" style={{ gap: 12 }}>
                <Text className="font-semibold text-gray-700">Navegação</Text>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity 
                    onPress={() => router.push('/')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="home" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Página Inicial</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/produtos')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="bag" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Meus Produtos</Text>
                    </View>
                    <View className="flex-row items-center">
                      {loadingProducts ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                      ) : (
                        <View className="bg-violet-100 px-2.5 py-0.5 rounded-full mr-2">
                          <Text className="text-violet-800 text-xs font-medium">{productCount}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/pedidos')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="document-text" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Meus Pedidos</Text>
                    </View>
                    <View className="flex-row items-center">
                      {loadingOrders ? (
                        <ActivityIndicator size="small" color="#4F46E5" />
                      ) : (
                        <View className="bg-violet-100 px-2.5 py-0.5 rounded-full mr-2">
                          <Text className="text-violet-800 text-xs font-medium">{orderCount}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/ads')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="megaphone" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Meus Anúncios</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/posts')}
                    className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="newspaper" size={20} color="#2563EB" />
                      <Text className="text-blue-700 font-medium">Publicações</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#60A5FA" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/nhonguistas')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="people" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Nhonguistas</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/(wallet)')}
                    className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="wallet" size={20} color="#2563EB" />
                      <Text className="text-blue-700 font-medium">SkyWallet</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#60A5FA" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/skai')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="desktop" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Assistente SkAI</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/overview')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="bar-chart" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Visão Geral</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Settings Section */}
              <View style={{ gap: 16 }}>
                <Text className="text-gray-700 font-medium px-1">Configurações</Text>
                <View style={{ gap: 8 }}>
                  <TouchableOpacity 
                    onPress={() => router.push('/settings')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="settings" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Configurações</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <View className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="moon" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Modo Escuro</Text>
                    </View>
                    <View className="w-11 h-6 bg-gray-200 rounded-full relative">
                      <View className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5" />
                    </View>
                  </View>

                  <TouchableOpacity 
                    onPress={() => router.push('/languages')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="language" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Idiomas</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/notifications')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="notifications" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Notificações</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => router.push('/help')}
                    className="bg-white/80 rounded-lg p-4 border border-gray-200 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="help-circle" size={20} color="#4B5563" />
                      <Text className="text-gray-700">Ajuda</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            <View style={{ gap: 16 }}>
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="bg-violet-500 rounded-lg p-4 items-center"
              >
                <Text className="text-white font-medium">Fazer Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/cadastro')}
                className="bg-white/80 border border-violet-600 rounded-lg p-4 items-center"
              >
                <Text className="text-violet-600 font-medium">Criar Conta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
} 