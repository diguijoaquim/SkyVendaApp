import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { base_url } from '../api/api';
import { useAuth } from './AuthContext';

export interface User {
  id: string | number;
  name: string;
  nome?: string; // Adiciona suporte para 'nome' também
  username: string;
  avatar?: string;
  foto?: string; // Adiciona suporte para 'foto' também
  isOnline?: boolean;
  is_online?: boolean; // Adiciona suporte para 'is_online' também
  lastSeen?: string;
  last_seen?: string; // Adiciona suporte para 'last_seen' também
}

export interface Message {
  id: string | number;
  chatId: string | number;
  content: string;
  senderId: string | number;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  type?: 'text' | 'image' | 'audio' | 'file';
  fileUrl?: string;
}

export interface Chat {
  id: string | number;
  user: User;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isOnline: boolean;
  messages?: Message[];
}

interface ChatContextType {
  chats: Chat[];
  selectedChat: Chat | null;
  selectedUser: any;
  setSelectedUser: (user: any) => void;
  messages: Message[];
  isLoading: boolean;
  isTyping: boolean;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  sendFile: (file: any, fileType?: string) => void;
  selectChat: (chatId: string | number) => void;
  createChat: (user: any) => Promise<Chat | null>;
  createNewChat: (userId: string) => void;
  markAsRead: (chatId: string) => void;
  fetchChats: () => Promise<void>;
  isConnected: boolean;
  error: string | null;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chats from API
  const fetchChats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Real API call to fetch chats with mensagens
      const response = await fetch(`${base_url}/chats`);
      const data = await response.json();

      const mapped: Chat[] = (Array.isArray(data) ? data : []).map((c: any) => {
        const msgs = Array.isArray(c.mensagens) ? c.mensagens : [];
        const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
        const messages: Message[] = msgs.map((m: any) => ({
          id: String(m.id ?? m.message_id ?? Date.now()),
          chatId: String(c.id),
          content: m.content,
          senderId: String(m.sender_id),
          timestamp: m.created_at,
          status: m.is_read ? 'read' : (m.is_delivered ? 'delivered' : 'sent'),
          type: m.message_type || 'text',
          fileUrl: m.file_url || undefined,
        }));

        const chat: Chat = {
          id: String(c.id),
          user: {
            id: String(c.id),
            name: c.nome || c.name || '',
            username: c.username || '',
            avatar: c.foto || c.avatar,
            isOnline: !!(c.is_online),
            lastSeen: c.last_seen,
          },
          lastMessage: last ? last.content : '',
          lastMessageAt: last ? last.created_at : '',
          unreadCount: c.total_news_msgs ?? c.unread_count ?? 0,
          isOnline: !!(c.is_online),
          messages,
        };
        return chat;
      });

      setChats(mapped);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const updateChats = (newChats: Chat[]) => {
    setChats(newChats);
  };

  // Auto-load chats on mount
  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create a new message with a temporary ID
      const newMessage: Message = {
        ...messageData,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'sending'
      };

      // Update the messages state optimistically
      setMessages(prev => [...prev, newMessage]);

      // Also append to selectedChat and chats message list for consistency
      setChats(prev => prev.map(chat => {
        if (chat.id.toString() === String(messageData.chatId)) {
          const current = Array.isArray(chat.messages) ? chat.messages : []
          return { ...chat, messages: [...current, newMessage] }
        }
        return chat
      }))
      if (selectedChat && selectedChat.id.toString() === String(messageData.chatId)) {
        const current = Array.isArray(selectedChat.messages) ? selectedChat.messages : []
        setSelectedChat({ ...selectedChat, messages: [...current, newMessage] })
      }

      // TODO: Implement actual message sending to your backend
      console.log('Sending message:', messageData);

      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update message status to sent
      setMessages(prev =>
        prev.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: 'sent' as const }
            : msg
        )
      );
      setChats(prev => prev.map(chat => {
        if (chat.id.toString() === String(messageData.chatId)) {
          const msgs = (chat.messages || []).map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
          return { ...chat, messages: msgs }
        }
        return chat
      }))
      if (selectedChat && selectedChat.id.toString() === String(messageData.chatId)) {
        const msgs = (selectedChat.messages || []).map(m => m.id === newMessage.id ? { ...m, status: 'sent' as const } : m)
        setSelectedChat({ ...selectedChat, messages: msgs })
      }

      // Update the chat's last message
      setChats(prev =>
        prev.map(chat =>
          chat.id.toString() === String(messageData.chatId)
            ? {
                ...chat,
                lastMessage: messageData.content,
                lastMessageAt: newMessage.timestamp,
                unreadCount: 0
              }
            : chat
        )
      );

      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');

      // Update message status to failed
      setMessages(prev => prev.map(msg =>
        (msg.chatId === messageData.chatId && msg.content === messageData.content && msg.senderId === messageData.senderId)
          ? { ...msg, status: 'failed' as const }
          : msg
      ));

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const selectChat = (chatId: string | number) => {
    try {
      setIsLoading(true);
      setError(null);

      // Find the chat by ID
      const chat = chats.find(c => c.id.toString() === chatId.toString());

      if (chat) {
        setSelectedChat(chat);

        // Mark messages as read when selecting a chat
        markAsRead(chatId.toString());

        // Load messages into context from chat
        setMessages(chat.messages || []);

        return chat;
      }

      return null;
    } catch (err) {
      console.error('Error selecting chat:', err);
      setError('Failed to load chat. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = (chatId: string) => {
    // Clear unread count and set messages to read for the selected chat
    setChats(prev => prev.map(chat => {
      if (chat.id.toString() === chatId.toString()) {
        const updated = (chat.messages || []).map(m => ({ ...m, status: 'read' as const }));
        return { ...chat, unreadCount: 0, messages: updated };
      }
      return chat;
    }));

    if (selectedChat && selectedChat.id.toString() === chatId.toString()) {
      const updated = (selectedChat.messages || []).map(m => ({ ...m, status: 'read' as const }));
      setSelectedChat({ ...selectedChat, unreadCount: 0, messages: updated });
      setMessages(updated);
    }
  };

  const createChat = async (user: any): Promise<Chat | null> => {
    try {
      console.log('=== CRIANDO CHAT ===');
      // Normalize and create a Chat object following the Chat interface
      const newChat: Chat = {
        id: String(user.id),
        user: {
          id: String(user.id),
          name: user.name || user.nome || '',
          nome: user.nome || user.name || '',
          username: user.username || '',
          avatar: user.avatar || user.foto || user.foto_perfil || undefined,
          foto: user.foto || user.avatar || undefined,
          isOnline: !!(user.is_online || user.isOnline),
          lastSeen: user.last_seen || user.lastSeen || undefined,
        },
        lastMessage: '',
        lastMessageAt: '',
        unreadCount: 0,
        isOnline: !!(user.is_online || user.isOnline),
        messages: [],
      };

      console.log('Chat criado:', newChat);

      // Add to chats list (put new chat first)
      setChats(prev => [newChat, ...prev]);

      // Set both selectedChat and selectedUser (some components use one or the other)
      setSelectedChat(newChat);
      setSelectedUser(newChat);

      console.log('Chat criado com sucesso!');
      return newChat;
      
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      return null;
    }
  };

  const createNewChat = (userId: string) => {
    // Create a new chat
  };

  const sendFile = async (file: any, fileType?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Here you would typically upload the file to your server
      // and then send the file URL as a message
      console.log('Sending file of type:', fileType, file);

      // Example implementation (you'll need to replace this with your actual file upload logic):
      // const formData = new FormData();
      // formData.append('file', file);
      // if (fileType) {
      //   formData.append('fileType', fileType);
      // }
      // const response = await fetch('YOUR_UPLOAD_ENDPOINT', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const fileUrl = await response.json();

      // Then send a message with the file URL
      // await sendMessage(fileUrl, selectedChat);
    } catch (error) {
      console.error('Error sending file:', error);
      setError('Failed to send file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const value: ChatContextType = {
    chats,
    selectedChat,
    selectedUser,
    setSelectedUser,
    messages,
    isLoading,
    isTyping,
    sendMessage,
    sendFile,
    selectChat,
    createChat,
    createNewChat,
    markAsRead,
    fetchChats,
    isConnected,
    error
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 