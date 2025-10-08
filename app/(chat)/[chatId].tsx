import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BASE_URL } from '@/services/api';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Modal } from 'react-native';

export default function ChatConversationScreen() {
  const router = useRouter();
  const { chatId, name, avatar } = useLocalSearchParams();
  const { user } = useAuth();
  const { selectedUser, chats, sendMessage: wsSendMessage, markAsRead, callState, callInfo, startCall, acceptCall, rejectCall, endCall } = useWebSocket();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [localMessages, setLocalMessages] = useState<UIMsg[]>([]);
  const flatListRef = useRef<FlatList>(null);

  const ensureAbsoluteUrl = (u?: string, userName?: string) => {
    if (!u) {
      // Cria avatar com inicial do nome
      const initial = userName ? userName.charAt(0).toUpperCase() : 'U'
      return `https://via.placeholder.com/150/3B82F6/FFFFFF?text=${initial}`
    }
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u
    const base = BASE_URL.replace(/\/$/, '')
    const path = u.replace(/^\//, '')
    return `${base}/${path}`
  }
  const chatIdStr = Array.isArray(chatId) ? chatId[0] : (chatId ? String(chatId) : '');

    // Resolve current chat user and messages from WebSocket context
  const currentChat = (React.useMemo(() => {
    console.log('🔍 DEBUG currentChat:', {
      chatIdStr,
      selectedUser: selectedUser ? { id: selectedUser.id, nome: (selectedUser as any).nome, username: selectedUser.username } : null,
      chatsCount: chats?.length,
      chats: chats?.map((c: any) => ({ id: c.id, nome: (c as any).nome, username: c.username, mensagensCount: c.mensagens?.length }))
    })
    
    // Primeiro: procura nos chats existentes (prioridade máxima)
    const byId = (chats || []).find((c: any) => String(c.id) === chatIdStr)
    if (byId) {
      console.log('✅ Chat encontrado nos chats:', byId)
      return byId
    }
    
    // Segundo: verifica se selectedUser é o chat atual
    if (selectedUser && String(selectedUser.id) === chatIdStr) {
      console.log('✅ Usando selectedUser:', selectedUser)
      return selectedUser
    }
    
    // Terceiro: cria um chat temporário com os parâmetros da rota
    if (chatIdStr && name) {
      console.log('⚠️ Criando chat temporário com parâmetros da rota')
      return {
        id: chatIdStr,
        nome: name as string,
        username: chatIdStr,
        foto: avatar as string,
        mensagens: [], // Chat vazio
        unread_count: 0
      }
    }
    
    console.log('❌ Nenhum chat encontrado')
    return null
  }, [selectedUser, chats, chatIdStr, name, avatar])) as any

  // Log do currentChat final
  console.log('🎯 currentChat FINAL:', currentChat)
  console.log('🎯 currentChat.nome:', currentChat?.nome)
  console.log('🎯 currentChat.name:', currentChat?.name)
  console.log('🎯 currentChat.username:', currentChat?.username)
  console.log('🎯 currentChat.mensagens:', currentChat?.mensagens)
  console.log('🎯 currentChat.mensagens.length:', currentChat?.mensagens?.length)

  type UIMsg = { id: string; content: string; senderId: string; timestamp: string; status?: 'sending'|'sent'|'delivered'|'read'|'failed'; type?: 'text'|'image'|'audio'|'file'; fileUrl?: string }
  const uiMessages: UIMsg[] = React.useMemo(() => {
    const msgs = (currentChat?.mensagens || []) as any[]
    console.log('📨 Processando mensagens:', {
      totalMensagens: msgs.length,
      mensagens: msgs.map(m => ({
        id: m.id || m.message_id,
        content: m.content?.slice(0, 50),
        sender_id: m.sender_id,
        created_at: m.created_at
      }))
    })
    
    const webSocketMessages = msgs.map(m => {
      const rawStatus = m.status as UIMsg['status'] | 'error' | undefined
      const status: UIMsg['status'] | undefined = rawStatus
        ? (rawStatus === 'error' ? 'failed' : rawStatus)
        : (m.is_read ? 'read' : (m.is_delivered ? 'delivered' : 'sent'))
      return {
        id: String(m.id ?? m.message_id ?? Date.now()),
        content: m.content,
        senderId: String(m.sender_id),
        timestamp: m.created_at,
        status,
        type: (m.message_type as any) || 'text',
        fileUrl: m.file_url || undefined,
      }
    })
    
    // Combina mensagens do WebSocket com mensagens locais
    const allMessages = [...webSocketMessages, ...localMessages]
    console.log('📨 Total de mensagens (WebSocket + Local):', allMessages.length)
    
    return allMessages
  }, [currentChat, localMessages])

  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChat?.id) return;
    
    const messageContent = messageInput.trim();
    const tempId = Date.now().toString();
    
    // Cria mensagem temporária para exibição imediata
    const tempMessage = {
      id: tempId,
      content: messageContent,
      senderId: String(user?.id),
      timestamp: new Date().toISOString(),
      status: 'sending' as const,
      type: 'text' as const,
      fileUrl: undefined
    };
    
    // Adiciona mensagem temporária ao estado local
    setLocalMessages((prev: UIMsg[]) => [...prev, tempMessage]);
    
    try {
      setIsLoading(true);
      await wsSendMessage(String(currentChat.id), messageContent, 'text');
      setMessageInput('');
      
      // Atualiza status da mensagem para 'sent'
      setLocalMessages((prev: UIMsg[]) => 
        prev.map((msg: UIMsg) => 
          msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
        )
      );
      
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
      
              // Atualiza status da mensagem para 'failed'
        setLocalMessages((prev: UIMsg[]) => 
          prev.map((msg: UIMsg) => 
            msg.id === tempId ? { ...msg, status: 'failed' as const } : msg
          )
        );
    } finally {
      setIsLoading(false);
    }
  };

  // Função para voltar
  const handleBack = () => {
    router.back();
  };

  // Função para abrir informações do usuário
  const handleUserInfo = () => {
    const displayName = (currentChat?.nome || currentChat?.name || (name as string) || '—') as string
    const uname = (currentChat?.username || '') as string
    const av = ensureAbsoluteUrl((currentChat?.foto as string) || (currentChat?.avatar as string) || (avatar as string), currentChat?.nome || currentChat?.name)

    // Navega para a tela de informações do usuário
    router.push({
      pathname: '/(chat)/userinfo',
      params: {
        name: displayName,
        username: uname,
        avatar: av,
        boldas_count: String((currentChat as any)?.boldas_count ?? 0),
        posts_count: String((currentChat as any)?.posts_count ?? 0),
      }
    })
  };

  // Abrir o perfil do usuário
  const goToProfile = () => {
    const uname = (currentChat?.username || '') as string
    if (!uname) return
    router.push({ pathname: '/(profile)/[username]', params: { username: uname } })
  }

  const handleAddPress = () => {
    setShowAttach((v) => !v)
  }

  const demoPickImage = () => Alert.alert('Imagem', 'Seleção de imagem (demo)')
  const demoPickFile = () => Alert.alert('Arquivo', 'Seleção de arquivo (demo)')
  const demoRecordAudio = () => Alert.alert('Áudio', 'Gravação de áudio (demo)')

  // Mark messages as read when opening the chat
  useEffect(() => {
    if (currentChat?.id) {
      try { markAsRead(String(currentChat.id)); } catch {}
    }
    // Depend only on the chat id to avoid re-running due to changing function identity
  }, [currentChat?.id])

  // Auto scroll to bottom when messages change
  useEffect(() => {
    console.log('📨 uiMessages mudou:', uiMessages.length)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)
  }, [uiMessages])

  // Monitorar mudanças no currentChat
  useEffect(() => {
    console.log('🔄 currentChat mudou:', {
      id: currentChat?.id,
      nome: currentChat?.nome || currentChat?.name,
      mensagensCount: currentChat?.mensagens?.length
    })
    
    // Sincroniza mensagens locais quando o chat muda
    if (currentChat?.id) {
      setLocalMessages([]); // Limpa mensagens locais ao trocar de chat
    }
  }, [currentChat?.id])

  // Renderiza uma mensagem
  const renderMessage = ({ item }: { item: UIMsg }) => {
    const isOwnMessage = item.senderId === String(user?.id);
    const isTextMessage = item.type === 'text';

    return (
      <View className={`flex-row ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
        <View className={`max-w-[75%] ${isOwnMessage ? 'bg-blue-500' : 'bg-gray-200'} rounded-2xl px-4 py-2`}>
          {!isOwnMessage && (
            <Text className="text-xs text-gray-500 mb-1">
              {currentChat?.nome || currentChat?.name || (name as string) || 'Usuário'}
            </Text>
          )}
          
          {isTextMessage ? (
            <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
              {item.content}
            </Text>
          ) : (
            <View className="items-center">
              <Ionicons 
                name={item.type === 'image' ? 'image' : 'document'} 
                size={24} 
                color={isOwnMessage ? '#ffffff' : '#6B7280'} 
              />
              <Text className={`text-sm mt-1 ${isOwnMessage ? 'text-white' : 'text-gray-600'}`}>
                {item.fileUrl || 'Arquivo'}
              </Text>
            </View>
          )}
          
          <View className="flex-row items-center justify-end mt-1">
            <Text className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatDistanceToNow(new Date(item.timestamp), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </Text>
            {isOwnMessage && (
              <View className="ml-1">
                {item.status === 'sending' && (
                  <ActivityIndicator size="small" color="#ffffff" />
                )}
                {item.status === 'sent' && (
                  <Ionicons name="checkmark" size={12} color="#ffffff" />
                )}
                {item.status === 'delivered' && (
                  <Ionicons name="checkmark-done" size={12} color="#ffffff" />
                )}
                {item.status === 'read' && (
                  <Ionicons name="checkmark-done" size={12} color="#4ADE80" />
                )}
                {item.status === 'failed' && (
                  <Ionicons name="alert-circle" size={12} color="#EF4444" />
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Renderiza o header da conversa
  const renderHeader = () => (
    <View className="bg-white border-b border-gray-200">
      <View className="flex-row items-center p-4">
        <TouchableOpacity
          onPress={handleBack}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={goToProfile}
          className="flex-row items-center flex-1"
        >
                     <Image
             source={{ 
               uri: ensureAbsoluteUrl((currentChat?.foto as string) || (currentChat?.avatar as string) || (avatar as string), currentChat?.nome || currentChat?.name) 
             }}
            style={{ width: 40, height: 40, borderRadius: 20 }}
            contentFit='cover'
            cachePolicy='memory-disk'
          />
          <View className="ml-3 flex-1">
            <Text className="font-semibold text-gray-900 text-lg" numberOfLines={1}>
              {currentChat?.nome || currentChat?.name || (name as string) || 'Usuário'}
            </Text>
            
          </View>
        </TouchableOpacity>
        
        {/* Video call button */}
        <TouchableOpacity
          onPress={() => {
            if (!currentChat?.id) return;
            const displayName = (currentChat?.nome || currentChat?.name || (name as string) || '—') as string;
            const uname = (currentChat?.username || '') as string;
            const av = ensureAbsoluteUrl((currentChat?.foto as string) || (currentChat?.avatar as string) || (avatar as string), displayName);
            startCall(String(currentChat.id), { name: displayName, username: uname, avatar: av });
          }}
          className="ml-2"
        >
          <Ionicons name="videocam-outline" size={24} color="#2563EB" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUserInfo}
          className="ml-2"
        >
          <Ionicons name="information-circle-outline" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderiza o input de mensagem
  const renderMessageInput = () => (
    <View style={{ 
      backgroundColor: 'white', 
      borderTopWidth: 1, 
      borderTopColor: '#E5E7EB',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000
    }}>
      {showAttach && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
          <TouchableOpacity onPress={demoPickImage} style={{ alignItems: 'center' }}>
            <Ionicons name="image-outline" size={22} color="#6B7280" />
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Imagem</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={demoPickFile} style={{ alignItems: 'center' }}>
            <Ionicons name="attach-outline" size={22} color="#6B7280" />
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Arquivo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={demoRecordAudio} style={{ alignItems: 'center' }}>
            <Ionicons name="mic-outline" size={22} color="#6B7280" />
            <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>Áudio</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ padding: 16, paddingTop: showAttach ? 8 : 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={{ marginRight: 12 }} onPress={handleAddPress}>
            <Ionicons name={showAttach ? 'close-circle-outline' : 'add-circle-outline'} size={24} color="#6B7280" />
          </TouchableOpacity>
          
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 8 }}>
            <TextInput
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Digite uma mensagem..."
              placeholderTextColor="#9CA3AF"
              style={{ flex: 1, fontSize: 16, color: '#111827' }}
              multiline
              maxLength={1000}
              returnKeyType="default"
              blurOnSubmit={false}
              enablesReturnKeyAutomatically={true}
              autoFocus={false}
            />
            <TouchableOpacity style={{ marginLeft: 8 }} onPress={demoRecordAudio}>
              <Ionicons name="mic-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!messageInput.trim() || isLoading}
            style={{
              marginLeft: 12,
              padding: 8,
              borderRadius: 20,
              backgroundColor: messageInput.trim() && !isLoading ? '#3B82F6' : '#D1D5DB'
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={messageInput.trim() && !isLoading ? '#ffffff' : '#9CA3AF'} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Renderiza estado vazio
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="chatbubble-outline" size={64} color="#D1D5DB" />
      <Text className="text-lg font-medium text-gray-500 mt-4 text-center">
        Nenhuma mensagem ainda
      </Text>
      <Text className="text-sm text-gray-400 mt-2 text-center">
                 Comece uma conversa com {currentChat?.nome || currentChat?.name || (name as string) || 'Usuário'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header - sempre visível e fixo */}
      {renderHeader()}
      
      {/* Lista de mensagens - ocupa o espaço restante */}
      <FlatList
        ref={flatListRef}
        data={uiMessages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingHorizontal: 16,
          paddingVertical: 8,
          paddingBottom: 100 // Espaço para o input
        }}
        onContentSizeChange={() => {
          if (uiMessages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      />
      
      {/* Video Call Modal */}
      <Modal
        visible={callState !== 'idle'}
        animationType="slide"
        transparent
        onRequestClose={() => {}}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', alignItems: 'center' }}>
            {/* Avatar */}
            <Image
              source={{ uri: ensureAbsoluteUrl(callInfo?.peerAvatar, callInfo?.peerName) }}
              style={{ width: 96, height: 96, borderRadius: 48 }}
              contentFit='cover'
            />
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827', marginTop: 12 }}>
              {callInfo?.peerName || 'Chamando...'}
            </Text>
            {!!callInfo?.peerUsername && (
              <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                @{callInfo?.peerUsername}
              </Text>
            )}
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
              {callState === 'incoming' ? 'Chamada recebida' : callState === 'outgoing' ? 'Chamando…' : callState === 'active' ? 'Chamada em andamento' : 'Finalizando…'}
            </Text>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 24 }}>
              {callState === 'incoming' && (
                <>
                  <TouchableOpacity onPress={acceptCall} style={{ backgroundColor: '#10B981', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="call" size={28} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={rejectCall} style={{ backgroundColor: '#EF4444', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="call" size={28} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                </>
              )}
              {(callState === 'outgoing' || callState === 'active' || callState === 'ending') && (
                <TouchableOpacity onPress={endCall} style={{ backgroundColor: '#EF4444', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="call" size={30} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Input de mensagem - sempre na parte inferior */}
      {renderMessageInput()}
    </SafeAreaView>
  );
}
