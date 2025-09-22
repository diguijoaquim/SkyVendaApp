import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// Define the Chat interface locally since we can't import it
interface Chat {
  id: number | string;
  user: {
    id: number | string;
    name: string;
    username: string;
    avatar?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isOnline: boolean;
}
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ChatItem = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  is_online: boolean;
  last_seen?: string;
};

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { chats, selectChat, isConnected } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filtra as conversas com base na busca
  useEffect(() => {
    // Mapear os chats do contexto (Chat[]) para o formato esperado (ChatItem[])
    const mapped: ChatItem[] = chats.map((c) => ({
      id: c.id.toString(),
      name: c.user.name,
      username: c.user.username,
      avatar: c.user.avatar,
      last_message: c.lastMessage,
      last_message_at: c.lastMessageAt,
      unread_count: c.unreadCount,
      is_online: c.isOnline,
      last_seen: c.user.lastSeen,
    }));

    if (searchQuery.trim() === '') {
      setFilteredChats(mapped);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = mapped.filter(
        (chat) =>
          chat.name.toLowerCase().includes(query) ||
          chat.username.toLowerCase().includes(query) ||
          chat.last_message?.toLowerCase().includes(query)
      );
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  // Função para carregar as conversas
  const loadChats = useCallback(async () => {
    try {
      setIsLoading(true);
      // Aqui você faria uma chamada para buscar as conversas do servidor
      // Por enquanto, usaremos as conversas do contexto
      
      // Simulando um atraso de rede
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Se não houver conexão, mostra os dados em cache
      if (!isConnected) {
        // Você pode adicionar um aviso de que está offline
      }
      
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isConnected]);

  // Carrega as conversas ao montar o componente
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Função para atualizar a lista de conversas
  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    loadChats();
  };

  // Função para navegar para o chat selecionado
  const handleSelectChat = (chat: ChatItem) => {
    selectChat(chat.id.toString());
    router.push({
      pathname: '/(chat)/[chatId]',
      params: { chatId: chat.id }
    });
  };

  // Renderiza cada item da lista de conversas
  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleSelectChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.avatar || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        {item.is_online && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.chatTime}>
            {item.last_message_at
              ? formatDistanceToNow(new Date(item.last_message_at), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : ''}
          </Text>
        </View>
        
        <View style={styles.chatMessage}>
          <Text
            style={[
              styles.chatLastMessage,
              item.unread_count > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.last_message || 'Nenhuma mensagem'}
          </Text>
          
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Renderiza o componente de lista vazia
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles" size={80} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>Nenhuma conversa</Text>
      <Text style={styles.emptySubtitle}>
        {isConnected
          ? 'Inicie uma nova conversa para começar a enviar mensagens'
          : 'Sem conexão com a internet. Conecte-se para ver as mensagens.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Conversas',
          headerShown: false,
        }}
      />
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mensagens</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="search" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Barra de pesquisa */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar conversas"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Lista de conversas */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={styles.chatList}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      
      {/* Botão de nova conversa */}
      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => {
          // Navegar para a tela de nova conversa
          router.push('/(chat)/new');
        }}
      >
        <Ionicons name="pencil" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 4,
    marginLeft: 16,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
  },
  onlineIndicator: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#888',
  },
  chatMessage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatLastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#888',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  newChatButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

