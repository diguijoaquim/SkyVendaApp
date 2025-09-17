import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getJson, putJson } from '@/services/api';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts';

type NotificationItem = {
  id: number;
  mensagem: string;
  data?: string;
  estado?: string;
  aberta?: boolean;
  lida?: boolean;
  tipo?: string | null;
  referencia_id?: number | null;
  referencia_tipo?: string | null;
  url_destino?: string | null;
  icone?: string | null;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const unreadCount = useMemo(() => items.filter(n => !n.lida).length, [items]);

  const filtered = useMemo(() => {
    if (filter === 'todas') return items;
    return items.filter(n => !n.lida);
  }, [items, filter]);

  const fetchNotifications = async () => {
    if (!token) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const resp = await getJson<any>(
        `/usuario/notificacoes/?page=1&per_page=20&ordem=desc&marcar_como_abertas=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list: NotificationItem[] = (resp?.notificacoes || []).map((n: any) => ({
        id: n.id,
        mensagem: n.mensagem,
        data: n.data,
        estado: n.estado,
        aberta: n.aberto ?? n.aberta, // servidor envia 'aberto'
        lida: n.lida,
        tipo: n.tipo,
        referencia_id: n.referencia_id,
        referencia_tipo: n.referencia_tipo,
        url_destino: n.url_destino,
        icone: n.icone,
      }));
      setItems(list);
      setTotal(Number(resp?.total) || list.length);
      setError(null);
    } catch (e: any) {
      setError('Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    if (!token || processingId === id) return;
    try {
      setProcessingId(id);
      await putJson(`/usuario/notificacoes/${id}/ler`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setItems(prev => prev.map(n => n.id === id ? { ...n, estado: 'lida', lida: true, aberta: true } : n));
    } catch (e) {
    } finally {
      setProcessingId(null);
    }
  };

  const deactivate = async (id: number) => {
    if (!token || processingId === id) return;
    try {
      setProcessingId(id);
      await putJson(`/usuario/notificacoes/${id}/desativar`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setItems(prev => prev.filter(n => n.id !== id));
    } catch (e) {
    } finally {
      setProcessingId(null);
    }
  };

  const onPressItem = async (n: NotificationItem) => {
    // marcar como lida e navegar
    if (!n.lida) await markAsRead(n.id);
    if (n.url_destino) {
      try {
        const url = n.url_destino;
        // traduz URLs da web para rotas mobile
        if (url.startsWith('/perfil/')) {
          const username = url.replace('/perfil/', '').trim();
          if (username) return router.push({ pathname: '/(profile)/[username]', params: { username } });
        }
        router.push(url as any);
      } catch {}
    }
  };

  const iconForType = (tipo?: string | null) => {
    switch (tipo) {
      case 'like_produto':
      case 'like_publicacao':
        return <Ionicons name="heart" size={18} color="#EF4444" />;
      case 'comentario_produto':
      case 'comentario_publicacao':
      case 'resposta_publicacao':
        return <Feather name="message-square" size={18} color="#4F46E5" />;
      case 'seguidor':
      case 'seguidor_novo':
        return <Feather name="user-plus" size={18} color="#10B981" />;
      case 'pedido':
      case 'pedido_aceito':
      case 'pedido_recusado':
      case 'pedido_entregue':
      case 'pedido_concluido':
        return <Ionicons name="bag" size={18} color="#F59E0B" />;
      default:
        return <Ionicons name="notifications" size={18} color="#6366F1" />;
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header} className='bg-violet-500'>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{unreadCount} novas</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilter('todas')}>
          <Text style={[styles.filterText, filter === 'todas' && styles.filterTextActive]}>Tudo ({total})</Text>
          {filter === 'todas' && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilter('nao_lidas')}>
          <Text style={[styles.filterText, filter === 'nao_lidas' && styles.filterTextActive]}>Não lida(s) ({unreadCount})</Text>
          {filter === 'nao_lidas' && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1,2,3,4].map(i => (
              <View key={i} style={styles.cardSkeleton}>
                <View style={styles.skelIcon} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.skelLineLg} />
                  <View style={styles.skelLineSm} />
                </View>
              </View>
            ))}
            <ActivityIndicator color="#4F46E5" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Sem notificações</Text>
            <Text style={styles.emptySub}>Volte mais tarde</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map(n => (
              <TouchableOpacity key={n.id} style={[styles.card, n.lida ? undefined : styles.cardUnread]} onPress={() => onPressItem(n)}>
                <View style={styles.cardLeftIcon}>{iconForType(n.tipo)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.message} numberOfLines={2}>{n.mensagem}</Text>
                  {!!n.data && <Text style={styles.date}>{n.data}</Text>}
                </View>
                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                  <TouchableOpacity onPress={() => markAsRead(n.id)} disabled={!!n.lida || processingId === n.id} style={styles.actBtn}>
                    <Ionicons name="checkmark-done" size={18} color={n.lida ? '#9CA3AF' : '#4F46E5'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deactivate(n.id)} disabled={processingId === n.id} style={styles.actBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',  paddingHorizontal: 12, paddingVertical: 12 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  filters: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  filterBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  filterText: { color: '#6B7280', fontWeight: '600' },
  filterTextActive: { color: '#4F46E5' },
  filterIndicator: { height: 2, backgroundColor: '#4F46E5', alignSelf: 'stretch', marginTop: 8, width: '100%' },

  content: { padding: 12 },
  cardSkeleton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  skelIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', marginRight: 10 },
  skelLineLg: { height: 14, width: '80%', backgroundColor: '#E5E7EB', borderRadius: 6 },
  skelLineSm: { height: 12, width: '50%', backgroundColor: '#E5E7EB', borderRadius: 6 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  cardUnread: { backgroundColor: '#EEF2FF' },
  cardLeftIcon: { width: 32, alignItems: 'center' },
  message: { color: '#111827', fontWeight: '600' },
  date: { marginTop: 4, color: '#6B7280', fontSize: 12 },
  actBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F3F4F6' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: '#374151', fontWeight: '700', marginTop: 8 },
  emptySub: { color: '#6B7280', fontSize: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  errorText: { color: '#DC2626', fontWeight: '600' },
});
