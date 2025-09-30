import { useAuth } from '@/contexts/AuthContext';
import { BASE_URL } from '@/services/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

interface ChatItem {
  id: string;
  nome: string;
  username: string;
  foto?: string;
  last_message?: string;
  last_message_at?: string;
  total_news_msgs: number;
  is_online: boolean;
  last_seen?: string;
}

// Componente UserHeader baseado no código web
const UserHeader = ({ user }: { user: any }) => {
  const router = useRouter();
  const { refreshChats } = useWebSocket();
  
  // Função para garantir URL absoluta da imagem
  const ensureAbsoluteUrl = (u?: string) => {
    if (!u) return 'https://skyvenda-mz.vercel.app/avatar.png'
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    const base = BASE_URL.replace(/\/$/, '')
    const path = u.replace(/^\//, '')
    return `${base}/${path}`
  }
  
  // Obter avatar do usuário com URL correta
  const getAvatar = () => {
    return ensureAbsoluteUrl(user?.perfil || user?.avatar || user?.foto_perfil)
  }
  
  return (
    <View className="flex flex-col p-3 border-b border-gray-200 ">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 48 }}>
        <TouchableOpacity onPress={() => router.back()}  className='px-3 py-1'>
          <Ionicons name="arrow-back" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{user?.username || 'Darkness'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={refreshChats}>
            <Ionicons name="refresh" size={28} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(chat)/new')} >
            <Ionicons name="create-outline" size={28} color="#6B7280"  />
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex">
        <View className="flex flex-col items-center w-[60px] space-y-2">
          <TouchableOpacity 
            onPress={() => user?.username && router.push({ 
              pathname: '/(profile)/[username]', 
              params: { username: user.username } 
            })}
            style={{ alignItems: 'center' }}
          >
            <View className="relative">
              <Image
                source={{ 
                  uri: getAvatar()
                }}
                className="w-[60px] h-[60px] rounded-full border-2 border-purple-400"
                style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#8B5CF6' }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {user?.is_online && (
                <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" 
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#ffffff' }} />
              )}
            </View>
            <Text className="text-gray-500 text-sm">{user?.name || 'Darkness'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Skeleton list similar to web <ChatSkeleton />
const ChatSkeleton = () => {
  const rows = Array.from({ length: 8 });
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {rows.map((_, i) => (
        <View key={`s-${i}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB' }} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <View style={{ width: '60%', height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 6 }} />
            <View style={{ width: '80%', height: 10, backgroundColor: '#F3F4F6', borderRadius: 5 }} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Componente ChatList: alinhado com UI Web
const ChatList = ({ chats, gettingChats, handleUserSelect, selectedUser, onlineUsers }: any) => {
  const DEFAULT_AVATAR = 'https://skyvenda-mz.vercel.app/avatar.png'

  const getLastMessage = (chat: any) => {
    const lastMessage = chat?.mensagens?.[chat.mensagens.length - 1]
    if (!lastMessage) return ''
    switch (lastMessage.message_type) {
      case 'audio':
        return 'Áudio'
      case 'image':
        return 'Imagem'
      case 'document':
        return 'Documento'
      default:
        return lastMessage.content || ''
    }
  }

  const getLastMessageTime = (chat: any) => {
    const lastMessage = chat?.mensagens?.[chat.mensagens.length - 1]
    const d = lastMessage?.created_at || chat?.lastMessageAt
    if (!d) return ''
    try {
      return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const getName = (item: any) => item?.nome || item?.user?.name || item?.user?.username || 'Usuário'
  const ensureAbsoluteUrl = (u?: string) => {
    if (!u) return DEFAULT_AVATAR
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    const base = BASE_URL.replace(/\/$/, '')
    const path = u.replace(/^\//, '')
    return `${base}/${path}`
  }
  const getAvatar = (item: any) => ensureAbsoluteUrl(item?.foto || item?.user?.avatar || DEFAULT_AVATAR)
  const getUnread = (item: any) => Number(item?.total_news_msgs ?? item?.unreadCount ?? 0)
  const isOnline = (item: any) => {
    const idStr = String(item?.id ?? item?.user?.id ?? '')
    if (Array.isArray(onlineUsers) && onlineUsers.length) {
      return onlineUsers.some((u: any) => String((u && (u.id ?? u.user_id ?? u))) === idStr)
    }
    return Boolean(item?.isOnline ?? item?.user?.is_online)
  }

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => handleUserSelect(item)}
      className={`flex flex-row items-center gap-2 p-3 rounded-lg ${selectedUser?.id === item.id ? 'bg-gray-100' : ''}`}
    >
      <View className="relative">
        <Image
          source={{ uri: getAvatar(item) }}
          style={{ width: 48, height: 48, borderRadius: 24 }}
          contentFit='cover'
          cachePolicy='memory-disk'
        />
        {isOnline(item) && (
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#ffffff' }} />
        )}
      </View>
      {/* Middle column: name and last message */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '500' }} numberOfLines={1}>{getName(item)}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
          {getLastMessage(item)}
        </Text>
      </View>
      {/* Right column: time and unread badge */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{
          color: getUnread(item) > 0 ? '#8B5CF6' : '#6B7280',
          fontSize: 12,
          marginLeft: 8,
        }}>
          {getLastMessageTime(item)}
        </Text>
        {getUnread(item) > 0 && (
          <View style={{
            backgroundColor: '#8B5CF6',
            borderRadius: 8,
            marginTop: 6,
            height: 16,
            minWidth: 16,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}>
            <Text style={{ color: 'white', fontSize: 12 }}>{getUnread(item)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  if (gettingChats) {
    return <ChatSkeleton />
  }

  return (
    <FlatList
      data={chats}
      renderItem={renderChatItem}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { chats, selectedUser, setSelectedUser, isConnected, refreshChats, markAsRead, onlineUsers } = useWebSocket();
  const [gettingChats, setGettingChats] = useState(false);
  const [activeTab, setActiveTab] = useState<'mensagens' | 'pedidos'>('mensagens');
  const ensureAbsoluteUrl = (u?: string) => {
    if (!u) return 'https://skyvenda-mz.vercel.app/avatar.png'
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    const base = BASE_URL.replace(/\/$/, '')
    const path = u.replace(/^\//, '')
    return `${base}/${path}`
  }

  // Fetch chats on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setGettingChats(true);
        await refreshChats();
      } finally {
        if (mounted) setGettingChats(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [refreshChats]);

  // Update chats when app comes to foreground
  useFocusEffect(
    React.useCallback(() => {
      refreshChats();
    }, [refreshChats])
  );

  // Update chats when returning from individual chat
  useFocusEffect(
    React.useCallback(() => {
      // Pequeno delay para garantir que o WebSocket processou as mensagens
      const timer = setTimeout(() => {
        refreshChats();
      }, 300);
      return () => clearTimeout(timer);
    }, [refreshChats])
  );

  const handleUserSelect = (chat: any) => {
    setSelectedUser(chat);
    markAsRead(String(chat.id));
    const name = chat?.nome || chat?.user?.name || chat?.user?.username || 'Usuário'
    const avatar = ensureAbsoluteUrl(chat?.foto || chat?.user?.avatar)
    router.push({
      pathname: '/(chat)/[chatId]',
      params: { chatId: String(chat.id), name, avatar }
    });
  };

  const getLastMessage = (chat: any) => {
    const lastMessage = chat.mensagens?.[chat.mensagens.length - 1];
    return lastMessage?.content || 'Oi';
  };

  // Dados baseados na aba ativa (por ora só chats reais)
  const getCurrentData = () => chats;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View className="flex h-full overflow-hidden">
        {/* Chat list sidebar */}
        <View className="w-full flex flex-col border-r border-gray-200">
          <UserHeader user={user}/>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
            <TouchableOpacity onPress={() => setActiveTab('mensagens')}>
              <Text style={{ 
                fontWeight: 'bold', 
                color: activeTab === 'mensagens' ? '#8B5CF6' : '#6B7280' 
              }}>
                Mensagens
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('pedidos')}>
              <Text style={{ 
                fontWeight: 'bold', 
                color: activeTab === 'pedidos' ? '#8B5CF6' : '#6B7280' 
              }}>
                Pedidos
              </Text>
            </TouchableOpacity>
          </View>
                  <ChatList 
              chats={getCurrentData()} 
              gettingChats={gettingChats} 
              handleUserSelect={handleUserSelect} 
              selectedUser={selectedUser} 
              getLastMessage={getLastMessage}
              onlineUsers={onlineUsers}
            />
        </View>
      </View>
    </SafeAreaView>
  );
}