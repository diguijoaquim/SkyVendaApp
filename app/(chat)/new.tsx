import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getJson } from '@/services/api';
import base_url from '@/api/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  nome: string;
  name?: string;
  username: string;
  foto?: string;
  avatar?: string;
  is_online: boolean;
  last_seen?: string;
  total_news_msgs?: number;
}

// Skeleton similar ao usado na lista de chats
const FriendsSkeleton = () => {
  const rows = Array.from({ length: 10 });
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {rows.map((_, i) => (
        <View key={`sk-f-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ width: '55%', height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
            <View style={{ width: '35%', height: 10, backgroundColor: '#F3F4F6', borderRadius: 5 }} />
          </View>
          <View style={{ width: 20, height: 20 }} />
        </View>
      ))}
    </View>
  );
};

export default function NewChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { setSelectedUser } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [creatingChat, setCreatingChat] = useState<string | null>(null); // ID do usuário que está criando chat

  // Filtra os usuários com base na busca
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.nome?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Helper para URL absoluta de avatar com fallback melhor
  const ensureAbsoluteUrl = (u?: string, userName?: string) => {
    if (!u) {
      // Cria avatar com inicial do nome
      const initial = userName ? userName.charAt(0).toUpperCase() : 'U'
      return `https://via.placeholder.com/150/3B82F6/FFFFFF?text=${initial}`
    }
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    const b = String(base_url).replace(/\/$/, '')
    const p = u.replace(/^\//, '')
    return `${b}/${p}`
  }

  // Função para carregar os usuários a partir da API real
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      // Authorization já é configurado pelo AuthContext -> services/api.setToken
      const url = `${base_url}/get_friends`;
      const res: any[] = await getJson<any[]>(url);
      const mapped: User[] = (res || []).map((r: any) => ({
        id: String(r.id),
        nome: r.nome || r.name || r.username || 'Usuário',
        username: r.username || '',
        foto: ensureAbsoluteUrl(r.foto || r.avatar || r.foto_perfil || r.perfil, r.nome || r.name || r.username),
        is_online: Boolean(r.is_online || r.online),
        total_news_msgs: r.total_news_msgs || 0
      }));
      setUsers(mapped);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error?.message || error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [base_url]);

  // Carrega os usuários ao montar o componente
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Função para atualizar a lista
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  // Função para selecionar um usuário e criar chat
  const handleUserSelect = async (selectedUser: User) => {
    try {
      // Validações básicas
      if (!selectedUser || !selectedUser.id) {
        Alert.alert('Erro', 'Usuário inválido selecionado');
        return;
      }

      // Verifica se o usuário está autenticado
      if (!user) {
        Alert.alert('Atenção', 'Precisa estar logado para iniciar conversas');
        router.push('/login');
        return;
      }

      // Verifica se não está tentando criar chat consigo mesmo
      if (selectedUser.id.toString() === user.id?.toString()) {
        Alert.alert('Atenção', 'Não é possível criar chat consigo mesmo');
        return;
      }

      // Define o usuário que está criando chat
      setCreatingChat(selectedUser.id.toString());

      console.log('Criando chat com usuário:', selectedUser);
      console.log('Estrutura do usuário:', {
        id: selectedUser.id,
        nome: selectedUser.nome,
        username: selectedUser.username,
        foto: selectedUser.foto,
        is_online: selectedUser.is_online
      });

      // Cria o chat diretamente navegando para a tela de chat
      console.log('🔥🔥🔥 INICIANDO CRIAÇÃO DO CHAT! 🔥🔥🔥');
      console.log('🔥 USUÁRIO SELECIONADO:', selectedUser);
      
      // Cria o chat no contexto WebSocket (como chat existente)
      const newChat = {
        id: String(selectedUser.id),
        name: selectedUser.nome || selectedUser.name || 'Usuário',
        username: selectedUser.username,
        avatar: selectedUser.foto || selectedUser.avatar,
        is_online: selectedUser.is_online,
        mensagens: [], // Chat vazio
        unread_count: selectedUser.total_news_msgs || 0
      };
      
      // Define como usuário selecionado
      setSelectedUser(newChat);
      
      console.log('🔥🔥🔥 CHAT CRIADO NO CONTEXTO! 🔥🔥🔥');
      console.log('🔥 NAVEGANDO PARA:', `/(chat)/${selectedUser.id}`);
      
      // Navega para o chat
      router.push(`/(chat)/${selectedUser.id}`);
      
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
    } finally {
      // Limpa o estado de loading
      setCreatingChat(null);
    }
  };

  // Função para voltar
  const handleBack = () => {
    router.back();
  };

  // Renderiza um item da lista de usuários
  const renderUserItem = ({ item }: { item: User }) => {
    const isCreating = creatingChat === item.id.toString();
    
    return (
      <TouchableOpacity
        onPress={() => handleUserSelect(item)}
        disabled={isCreating}
        className={`flex-row items-center p-4 border-b border-gray-100 ${isCreating ? 'opacity-50' : 'active:bg-gray-50'}`}
      >
        {/* Avatar */}
        <View className="relative">
          <Image
            source={{ 
              uri: ensureAbsoluteUrl(item.foto || item.avatar) 
            }}
            className="w-12 h-12 rounded-full"
          />
          {item.is_online && (
            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        {/* User Info */}
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-gray-900 text-base">
            {item.nome || item.name}
          </Text>
          <Text className="text-sm text-gray-500">
            @{item.username}
          </Text>
        </View>

        {/* Loading ou Arrow */}
        {isCreating ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </TouchableOpacity>
    );
  };

  // Renderiza o header
  const renderHeader = () => (
    <View className="bg-white border-b border-gray-200">
      <View className="flex-row items-center p-4">
        <TouchableOpacity
          onPress={handleBack}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text className="font-semibold text-gray-900 text-lg">
          Nova Conversa
        </Text>
      </View>
    </View>
  );

  // Renderiza a barra de pesquisa
  const renderSearchBar = () => (
    <View className="bg-white px-4 py-3">
      <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Pesquisar usuários..."
          placeholderTextColor="#9CA3AF"
          className="flex-1 ml-2 text-base text-gray-900"
        />
      </View>
    </View>
  );

  // Renderiza o estado vazio
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="people-outline" size={64} color="#D1D5DB" />
      <Text className="text-lg font-medium text-gray-500 mt-4 text-center">
        {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
      </Text>
      <Text className="text-sm text-gray-400 mt-2 text-center">
        {searchQuery ? 'Tente ajustar sua pesquisa' : 'Verifique sua conexão'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      {renderHeader()}
      
      {/* Barra de pesquisa */}
      {renderSearchBar()}
      
      {/* Lista de usuários */}
      {isLoading ? (
        <FriendsSkeleton />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </SafeAreaView>
  );
}
