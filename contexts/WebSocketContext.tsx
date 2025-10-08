import * as React from 'react';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Alert, Platform, AppState } from 'react-native';
// Web-only for now: do not import native modules like expo-av or expo-notifications
import { getJson, BASE_URL } from '@/services/api';

// Debug helpers
// TEMP: force-enable debug logs. Set EXPO_PUBLIC_DEBUG_WS=false to disable.
const DEBUG_WS = true;
const wsLog = (...args: any[]) => { if (DEBUG_WS) console.log('[WS]', ...args); };
const wsWarn = (...args: any[]) => { if (DEBUG_WS) console.warn('[WS]', ...args); };
const wsError = (...args: any[]) => { if (DEBUG_WS) console.error('[WS]', ...args); };
// Strongly-typed WebSocket context to avoid `never` inference issues downstream
export type Message = {
  id: string;
  message_id?: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_delivered: boolean;
  is_read: boolean;
  created_at: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  reaction?: string | null;
};

export type ChatUser = {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  last_seen?: string;
  is_online?: boolean;
  mensagens?: Message[];
  unread_count?: number;
  // Campos adicionais para compatibilidade com o chat list
  lastMessage?: string;
  lastMessageAt?: string;
  last_message?: string;
  last_message_at?: string;
  // Campos para compatibilidade com a UI existente
  user?: {
    name: string;
    username: string;
    avatar?: string;
    last_seen?: string;
    is_online?: boolean;
  };
};

// Video call types
export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active' | 'ending';
export type CallInfo = {
  callId: string;
  peerId: string;
  peerName?: string;
  peerUsername?: string;
  peerAvatar?: string;
  status?: string; // ringing | accepted | rejected | ended
  reason?: string; // busy | timeout | ended_by_user | peer_disconnected
  createdAt?: string;
};

type WebSocketContextValue = {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  chats: ChatUser[];
  selectedUser: ChatUser | null;
  setSelectedUser: React.Dispatch<React.SetStateAction<ChatUser | null>>;
  newMessage: number;
  newNotification: number;
  newOrders: number;
  userTyping: string | null;
  userRecording: string | null;
  onlineUsers: string[];
  refreshChats: () => Promise<void>;
  sendMessage: (
    receiverId: string,
    content: string,
    type?: Message['message_type'],
    file?: any
  ) => Promise<string | null>;
  markAsRead: (chatId: string) => void;
  markAllChatsAsRead: () => void;
  connect: () => void;
  disconnect: () => void;
  // Video call API
  callState: CallState;
  callInfo: CallInfo | null;
  startCall: (toUserId: string, peerHint?: { name?: string; username?: string; avatar?: string }) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);


export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const { token, user } = useAuth();
  const [newMessage, setNewMessage] = useState<number>(0);
  const [newNotification, setNewNotification] = useState<number>(0);
  const [newOrders, setNewOrders] = useState<number>(0);
  const [userTyping, setUserTyping] = useState<string | null>(null);
  const [userRecording, setUserRecording] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  // Video call state
  const [callState, setCallState] = useState<CallState>('idle');
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
  // Web-only: no sound instance for notifications
  
  const retryRef = useRef<number>(0);
  const processedMessages = useRef<Set<string>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const connectingRef = useRef<boolean>(false);
  const suppressReconnectRef = useRef<boolean>(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPongAtRef = useRef<number>(Date.now());
  const sendQueueRef = useRef<{
    receiverId: string;
    content: string;
    type: Message['message_type'];
    file?: any;
    tempId: string;
  }[]>([]);

  // -------------- Video Call Methods --------------
  const startCall = (toUserId: string, peerHint?: { name?: string; username?: string; avatar?: string }) => {
    if (!toUserId) return;
    const isOpen = socketRef.current?.readyState === WebSocket.OPEN;
    try {
      if (peerHint) {
        setCallInfo({
          callId: '',
          peerId: String(toUserId),
          peerName: peerHint.name,
          peerUsername: peerHint.username,
          peerAvatar: peerHint.avatar,
          status: 'ringing',
        });
        setCallState('outgoing');
      }
      const payload = { type: 'video_call', action: 'start_call', to_user: String(toUserId), receiver_id: String(toUserId) } as const;
      if (isOpen) {
        socketRef.current?.send(JSON.stringify(payload));
      } else {
        wsWarn('startCall: socket not open');
        connect();
        setTimeout(() => { try { socketRef.current?.send(JSON.stringify(payload)); } catch {} }, 500);
      }
    } catch (e) {
      wsWarn('startCall error', e as any);
    }
  };

  const acceptCall = () => {
    if (!callInfo?.callId) return;
    const payload = { type: 'video_call', action: 'call_response', call_id: callInfo.callId, accepted: true } as const;
    try { socketRef.current?.send(JSON.stringify(payload)); } catch (e) { wsWarn('acceptCall error', e as any); }
  };

  const rejectCall = () => {
    if (!callInfo?.callId) return;
    const payload = { type: 'video_call', action: 'call_response', call_id: callInfo.callId, accepted: false } as const;
    try { socketRef.current?.send(JSON.stringify(payload)); } catch (e) { wsWarn('rejectCall error', e as any); }
    setCallState('idle');
    setTimeout(() => setCallInfo(null), 500);
  };

  const endCall = () => {
    if (!callInfo?.callId) { setCallState('idle'); setCallInfo(null); return; }
    setCallState('ending');
    const payload = { type: 'video_call', action: 'end_call', call_id: callInfo.callId } as const;
    try { socketRef.current?.send(JSON.stringify(payload)); } catch (e) { wsWarn('endCall error', e as any); }
    setTimeout(() => { setCallState('idle'); setCallInfo(null); }, 600);
  };

  // Fetch chats from API and map to expected shape
  const refreshChats = useCallback(async () => {
    if (!token) { wsWarn('refreshChats: skipped (no token)'); return; }
    try {
      wsLog('refreshChats: fetching /chats');
      const data: any = await getJson('/chats');
      wsLog('refreshChats: received', Array.isArray(data) ? data.length : 0, 'chats');
      const mapped: ChatUser[] = (data || []).map((c: any) => {
        const mensagens = Array.isArray(c.mensagens) ? c.mensagens : [];
        const lastMsg = mensagens.length > 0 ? mensagens[mensagens.length - 1] : null;

        const chat: ChatUser & any = {
          id: String(c.id ?? c.user_id ?? c.username ?? c.id_unico ?? ''),
          name: c.nome || c.name || c.user?.name || '',
          username: c.username || c.user?.username || '',
          avatar: c.foto || c.avatar || c.user?.avatar,
          last_seen: c.last_seen || c.user?.last_seen,
          is_online: (typeof c.is_online !== 'undefined') ? c.is_online : (c.user?.is_online ?? false),
          mensagens,
          unread_count: c.total_news_msgs ?? c.unread_count ?? c.unreadCount ?? 0,
          // Campos para o chat list
          lastMessage: lastMsg ? lastMsg.content : '',
          lastMessageAt: lastMsg ? lastMsg.created_at : '',
          last_message: lastMsg ? lastMsg.content : '',
          last_message_at: lastMsg ? lastMsg.created_at : '',
        };

        // Fields expected by current ChatList UI
        chat.user = {
          name: chat.name,
          username: chat.username,
          avatar: chat.avatar,
          last_seen: chat.last_seen,
          is_online: chat.is_online,
        };
        chat.isOnline = !!chat.is_online;
        chat.unreadCount = chat.unread_count;

        return chat;
      });
      wsLog('refreshChats: mapped', mapped.length, 'chats');
      setChats(mapped);
      // Atualiza contador agregado de mensagens não lidas
      const totalUnread = mapped.reduce((sum, c) => sum + (Number(c.unread_count || 0)), 0);
      setNewMessage(totalUnread);
    } catch (error) {
      wsError('refreshChats error:', error);
    }
  }, [token]);

  // Initial fetch when token is available
  useEffect(() => {
    refreshChats();
  }, [token, refreshChats]);

  // Notification sound disabled (asset not bundled yet). Enable when asset is available.

  const playNotificationSound = async () => {
    // Web-only: skip native sound
    return;
  };

  const connect = () => {
    // Manual (re)connect clears suppression
    suppressReconnectRef.current = false;
    if (!token || socketRef.current || connectingRef.current) { wsWarn('connect: skipped', { hasToken: !!token, hasSocket: !!socketRef.current, connecting: connectingRef.current }); return; }

    try {
      // Derive WS URL from API BASE_URL
      const base = (BASE_URL || '').trim().replace(/\/+$/, '');
      const wsBase = base.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBase}/ws?token=${encodeURIComponent(token)}`;
      wsLog('connect: opening', wsUrl);
      connectingRef.current = true;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        wsLog('onopen: connected');
        setIsConnected(true);
        setIsReconnecting(false);
        retryRef.current = 0;
        connectingRef.current = false;
        // Start ping keepalive
        try { 
          if (pingIntervalRef.current) { 
            clearInterval(pingIntervalRef.current); 
          } 
        } catch {}
        lastPongAtRef.current = Date.now();
        
        // Atualiza chats quando reconecta
        setTimeout(() => {
          refreshChats();
        }, 1000);
        
        pingIntervalRef.current = setInterval(() => {
          try {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ type: 'ping', ts: new Date().toISOString() }));
              // If no pong within 30s, force reconnect
              if (Date.now() - lastPongAtRef.current > 30000) {
                wsWarn('pong timeout -> closing socket to trigger reconnect');
                try { socketRef.current?.close(); } catch {}
              }
            }
          } catch {}
        }, 15000);
        // Flush queued messages
        const queued = [...sendQueueRef.current];
        sendQueueRef.current = [];
        queued.forEach(item => {
          try {
            const payload = {
              type: 'message',
              to_user: item.receiverId,
              receiver_id: item.receiverId,
              content: item.content,
              message_type: item.type,
              file_url: item.file?.uri,
              file_name: item.file?.name,
              file_size: item.file?.size,
              message_id: item.tempId,
              client_temp_id: item.tempId,
            };
            wsLog('flush send payload:', payload);
            socketRef.current?.send(JSON.stringify(payload));
          } catch (err) {
            wsWarn('flush queue send failed for tempId', item.tempId, err);
          }
        });
      };

      ws.onmessage = (event) => {
        wsLog('onmessage: raw', typeof event.data, String(event.data).slice(0, 200));
        try {
          const data = JSON.parse(event.data);
          wsLog('onmessage: parsed type=', data?.type || '(unknown)');
          // Consider any inbound message as activity for keepalive
          lastPongAtRef.current = Date.now();
          // Normalize and route by type. Only message events should mutate chat messages.
          const t = data?.type;
          if (t === 'ping') {
            try { ws.send(JSON.stringify({ type: 'pong', ts: new Date().toISOString() })); } catch {}
            return;
          }
          if (t === 'pong') {
            lastPongAtRef.current = Date.now();
            return;
          }
          if (t === 'notifications_unread_count') {
            const payload = data.data || data;
            const total = Number(payload?.total_nao_lidas ?? 0);
            setNewNotification(isNaN(total) ? 0 : total);
            return;
          }
          if (t === 'notification_new') {
            // Incrementa contador de notificações e detecta notificações de pedidos
            setNewNotification(prev => prev + 1);
            try {
              const d = data.data || {};
              const tipo = (d.tipo || '').toString().toLowerCase();
              if (tipo.includes('pedido')) {
                setNewOrders(prev => prev + 1);
              }
            } catch {}
            return;
          }
          if (t === 'message') {
            const payload = data.data || data; // backend may wrap in data
            handleIncomingMessage(payload);
            return;
          }
          if (t === 'video_call') {
            const action = (data.action || '').toString();
            const d = data.data || {};
            wsLog('video_call action:', action, d);
            if (action === 'incoming_call') {
              const info: CallInfo = {
                callId: String(d.call_id || ''),
                peerId: String(d.caller_id || ''),
                peerName: d.caller_name,
                peerUsername: d.caller_username,
                peerAvatar: d.caller_avatar,
                status: 'ringing',
                createdAt: d.created_at,
              };
              setCallInfo(info);
              setCallState('incoming');
              return;
            }
            if (action === 'call_created') {
              const info: CallInfo = {
                callId: String(d.call_id || ''),
                peerId: String(d.receiver_id || ''),
                peerName: d.receiver_name,
                peerUsername: d.receiver_username,
                peerAvatar: d.receiver_avatar,
                status: 'ringing',
                createdAt: d.created_at,
              };
              setCallInfo(info);
              setCallState('outgoing');
              return;
            }
            if (action === 'call_response') {
              const accepted = !!d.accepted;
              if (accepted) {
                setCallState('active');
                setCallInfo(prev => prev ? { ...prev, status: 'accepted' } : prev);
              } else {
                setCallInfo(prev => prev ? { ...prev, status: 'rejected', reason: 'rejected' } : prev);
                setCallState('idle');
                setTimeout(() => setCallInfo(null), 500);
              }
              return;
            }
            if (action === 'call_accepted') {
              setCallState('active');
              setCallInfo(prev => prev ? { ...prev, status: 'accepted' } : prev);
              return;
            }
            if (action === 'call_rejected') {
              setCallInfo(prev => prev ? { ...prev, status: 'rejected', reason: 'rejected' } : prev);
              setCallState('idle');
              setTimeout(() => setCallInfo(null), 500);
              return;
            }
            if (action === 'call_ended') {
              setCallInfo(prev => prev ? { ...prev, status: 'ended', reason: d.reason || 'ended_by_peer' } : prev);
              setCallState('idle');
              setTimeout(() => setCallInfo(null), 500);
              return;
            }
            if (action === 'error' || action === 'busy' || action === 'timeout') {
              setCallInfo(prev => prev ? { ...prev, status: 'ended', reason: action } : prev);
              setCallState('idle');
              setTimeout(() => setCallInfo(null), 800);
              return;
            }
            // sdp_offer/sdp_answer/ice_candidate will be handled when media is integrated
            return;
          }
          // Info: detect session replacement and suppress auto-reconnect
          if (t === 'info') {
            const msg: string = data?.data?.message || data?.message || '';
            if (typeof msg === 'string' && msg.toLowerCase().includes('sessão foi substituída')) {
              wsWarn('server info: session replaced -> suppress auto-reconnect');
              suppressReconnectRef.current = true;
            }
            return;
          }
          // Other types we currently ignore or handle elsewhere (notifications, status, etc.)
          if (t === 'user_status' || t === 'typing' || t === 'recording' || t === 'message_status' || t === 'notification' || t === 'order_status') {
            return;
          }
        } catch (error) {
          wsError('onmessage: JSON parse error', error);
        }
      };

      ws.onclose = () => {
        wsWarn('onclose: disconnected');
        setIsConnected(false);
        socketRef.current = null;
        connectingRef.current = false;
        // Clear ping interval
        try { if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; } } catch {}
        
        if (suppressReconnectRef.current) {
          wsWarn('auto-reconnect suppressed by server info');
          setIsReconnecting(false);
          return;
        }

        // Reconnect with exponential backoff
        const timeout = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
        retryRef.current += 1;
        setTimeout(() => {
          if (!socketRef.current) {
            wsLog('reconnect: attempting');
            setIsReconnecting(true);
            connect();
          }
        }, timeout);
      };

      ws.onerror = (error) => {
        wsError('onerror:', error);
        connectingRef.current = false;
      };

      socketRef.current = ws;
      setSocket(ws);
    } catch (error) {
      wsError('connect error:', error);
      connectingRef.current = false;
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
    // Clear ping interval
    try { if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; } } catch {}
  };

  const handleIncomingMessage = async (messageData: any) => {
    wsLog('handleIncomingMessage:', messageData?.type || '(no type)');
    const { from_user, content, message_id } = messageData || {};
    if (typeof from_user === 'undefined' || from_user === null) {
      wsWarn('handleIncomingMessage: skipped (no from_user)');
      return;
    }
    const messageKey = `${from_user}-${content}-${message_id || Date.now()}`;
    
    if (processedMessages.current.has(messageKey)) {
      wsLog('handleIncomingMessage: duplicate ignored', messageKey);
      return;
    }
    
    processedMessages.current.add(messageKey);
    if (processedMessages.current.size > 100) {
      const oldestKeys = Array.from(processedMessages.current).slice(0, 50);
      oldestKeys.forEach(key => processedMessages.current.delete(key));
    }

    // Web-only: no native notifications or sounds for now
    if (from_user !== user?.id) {
      await playNotificationSound(); // no-op
      // You could hook a web toast/indicator here in the future
    }

    const normalizedUserId = String(from_user);
    
    setChats(prevChats => {
      wsLog('handleIncomingMessage: updating chats for user', normalizedUserId, 'prevChats=', prevChats.length);
      const chatIndex = prevChats.findIndex(chat => String(chat.id) === normalizedUserId);
      
      const newMessage: Message = {
        id: message_id || Date.now().toString(),
        message_id: message_id,
        sender_id: normalizedUserId,
        receiver_id: String(user?.id ?? ''),
        content: content,
        message_type: messageData.message_type || 'text',
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        file_size: messageData.file_size,
        is_delivered: true,
        is_read: selectedUser?.id === normalizedUserId,
        created_at: new Date().toISOString(),
        status: 'delivered',
        reaction: null
      };

      if (chatIndex !== -1) {
        // Update existing chat
        const chat = prevChats[chatIndex];
        const updatedChat = {
          ...chat,
          mensagens: [...(chat.mensagens || []), newMessage],
          unread_count: selectedUser?.id === normalizedUserId ? 0 : (chat.unread_count || 0) + 1,
          // Adiciona campos necessários para o chat list
          lastMessage: newMessage.content,
          lastMessageAt: newMessage.created_at,
          last_message: newMessage.content,
          last_message_at: newMessage.created_at
        };

        if (selectedUser?.id === normalizedUserId) {
          setSelectedUser(updatedChat);
        }

        const newChats = [...prevChats];
        newChats[chatIndex] = updatedChat;
        wsLog('handleIncomingMessage: appended to existing chat', normalizedUserId, 'total msgs=', updatedChat.mensagens?.length || 0);
        // Atualiza badge de mensagens: soma agregada rápida (incremento se chat não está aberto)
        if (!(selectedUser?.id === normalizedUserId)) {
          setNewMessage(prev => prev + 1);
        }
        return newChats;
      } else {
        // Create new chat
        const newChat: ChatUser = {
          id: normalizedUserId,
          name: messageData.sender_name || 'Novo Usuário',
          username: messageData.sender_username || '',
          avatar: messageData.sender_avatar,
          mensagens: [newMessage],
          unread_count: 1,
          is_online: true,
          // Adiciona campos necessários para o chat list
          lastMessage: newMessage.content,
          lastMessageAt: newMessage.created_at,
          last_message: newMessage.content,
          last_message_at: newMessage.created_at
        };

        wsLog('handleIncomingMessage: created new chat', normalizedUserId);
        
        // Atualiza chats após criar novo chat
        setTimeout(() => {
          refreshChats();
        }, 500);
        // Novo chat implica nova mensagem não lida
        setNewMessage(prev => prev + 1);
        
        return [newChat, ...prevChats];
      }
    });
  };

  const sendMessage = async (receiverId: string, content: string, type: Message['message_type'] = 'text', file?: any) => {
    if (!user?.id) return null;

    const tempId = Date.now().toString();
    wsLog('sendMessage: ->', { receiverId, content: String(content).slice(0, 120), type, hasFile: !!file });
    const message: Message = {
      id: tempId,
      message_id: tempId,
      sender_id: String(user.id),
      receiver_id: receiverId,
      content,
      message_type: type,
      is_delivered: false,
      is_read: false,
      created_at: new Date().toISOString(),
      status: 'sending',
      file_url: file?.uri,
      file_name: file?.name,
      file_size: file?.size
    };

    // Optimistically update UI
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(chat => chat.id === receiverId);
      if (chatIndex !== -1) {
        const chat = prevChats[chatIndex];
        const updatedChat = {
          ...chat,
          mensagens: [...(chat.mensagens || []), message],
          // Adiciona campos necessários para o chat list
          lastMessage: message.content,
          lastMessageAt: message.created_at,
          last_message: message.content,
          last_message_at: message.created_at
        };
        const newChats = [...prevChats];
        newChats[chatIndex] = updatedChat;
        wsLog('sendMessage: optimistic append, chat=', receiverId, 'msgs=', updatedChat.mensagens?.length || 0);
        if (selectedUser?.id === receiverId) {
          setSelectedUser(updatedChat);
        }
        return newChats;
      }
      return prevChats;
    });

    // Build payload
    const payload = {
      type: 'message',
      to_user: receiverId,
      receiver_id: receiverId,
      content: content,
      message_type: type,
      file_url: file?.uri,
      file_name: file?.name,
      file_size: file?.size,
      message_id: tempId,
      client_temp_id: tempId
    };

    // If socket is not OPEN, enqueue and try connecting
    const state = socketRef.current?.readyState;
    if (state !== WebSocket.OPEN) {
      wsWarn('sendMessage: socket not open, enqueue', { state });
      sendQueueRef.current.push({ receiverId, content, type, file, tempId });
      if (!socketRef.current && !connectingRef.current) {
        connect();
      }
      return tempId;
    }

    try {
      wsLog('send payload:', payload);
      socketRef.current?.send(JSON.stringify(payload));
      wsLog('sendMessage: payload sent');
      
      // Atualiza o chat list após enviar mensagem com sucesso
      setTimeout(() => {
        refreshChats();
      }, 500);
      
      // Update message status to 'sent'
      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(chat => chat.id === receiverId);
        if (chatIndex !== -1) {
          const chat = prevChats[chatIndex];
          const updatedMessages = chat.mensagens?.map(msg => 
            msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
          ) || [];
          const updatedChat = { ...chat, mensagens: updatedMessages };
          const newChats = [...prevChats];
          newChats[chatIndex] = updatedChat;
          if (selectedUser?.id === receiverId) setSelectedUser(updatedChat);
          return newChats;
        }
        return prevChats;
      });
    } catch (error) {
      wsWarn('sendMessage: send failed, enqueue fallback', error);
      sendQueueRef.current.push({ receiverId, content, type, file, tempId });
      if (!socketRef.current && !connectingRef.current) connect();
    }

    return tempId;
  };

  const markAsRead = (chatId: string) => {
    wsLog('markAsRead:', chatId);
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(chat => chat.id === chatId);
      if (chatIndex !== -1) {
        const chat = prevChats[chatIndex];
        const hasUnread = (chat.mensagens || []).some(m => !m.is_read);
        if (!hasUnread && (chat.unread_count ?? 0) === 0) {
          wsLog('markAsRead: skipped (already all read)');
          return prevChats;
        }
        const updatedMessages = chat.mensagens?.map(msg => ({ ...msg, is_read: true })) || [];
        const newChats = [...prevChats];
        newChats[chatIndex] = { ...chat, mensagens: updatedMessages, unread_count: 0 };
        wsLog('markAsRead: updated messages to read, count=', updatedMessages.length);
        
        // Atualiza chats após marcar como lido
        setTimeout(() => {
          refreshChats();
        }, 300);
        
        return newChats;
      }
      return prevChats;
    });
  };

  const markAllChatsAsRead = () => {
    wsLog('markAllChatsAsRead: begin');
    // Local: zerar todas as contagens e marcar mensagens como lidas
    setChats((prev: ChatUser[]) => prev.map((c: ChatUser) => ({
      ...c,
      mensagens: (c.mensagens || []).map((m: Message) => ({ ...m, is_read: true })),
      unread_count: 0,
      unreadCount: 0,
    })));
    setNewMessage(0);
    // Backend: enviar read_all para cada chat com não lidas
    try {
      const isOpen = socketRef.current?.readyState === WebSocket.OPEN;
      if (isOpen) {
        const ids = Array.from(new Set((chats || []).filter((c: ChatUser) => (c.unread_count || 0) > 0).map((c: ChatUser) => String(c.id))));
        ids.forEach((id: string) => {
          try {
            socketRef.current?.send(JSON.stringify({ type: 'read_all', to_user: id }));
          } catch (e) {
            wsWarn('markAllChatsAsRead send failed for', id, e as any);
          }
        });
      } else {
        wsWarn('markAllChatsAsRead: socket not open -> will refresh');
        setTimeout(() => { refreshChats(); }, 800);
      }
    } catch (e) {
      wsWarn('markAllChatsAsRead error', e as any);
    }
    // Sincroniza do servidor depois
    setTimeout(() => { refreshChats(); }, 800);
  };

  // Connect on mount and when token changes
  useEffect(() => {
    wsLog('provider mount: token?', !!token);
    if (token) {
      wsLog('provider mount: initiating connect');
      connect();
    } else {
      wsWarn('provider mount: no token, not connecting');
    }

    return () => {
      disconnect();
    };
  }, [token]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        wsLog('appState: active -> connect');
        connect();
        // Atualiza chats quando app volta ao foco
        setTimeout(() => {
          refreshChats();
        }, 1000);
      } else if (nextAppState === 'background') {
        // Optionally disconnect when app is in background to save battery
        // disconnect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        isReconnecting,
        chats,
        selectedUser,
        setSelectedUser,
        newMessage,
        newNotification,
        newOrders,
        userTyping,
        userRecording,
        onlineUsers,
        refreshChats,
        sendMessage,
        markAsRead,
        markAllChatsAsRead,
        connect,
        disconnect,
        // Video call API
        callState,
        callInfo,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
