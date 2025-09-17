import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getJson, postJson, putJson } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type Order = {
  id: number;
  status?: string;
  aceito_pelo_vendedor?: boolean;
  compra?: string | boolean; // 'compra' | true
  venda?: string | boolean;  // 'venda' | true
  id_vendedor?: string;
  id_comprador?: string;
  nome_vendedor?: string;
  nome_comprador?: string;
  total?: number;
};

export default function PedidosScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'vendas' | 'compras' | 'pendentes'>('todos');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!token) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getJson<Order[]>(`/pedidos/`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e: any) {
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const filteredOrders = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    const list = orders.filter((o) => {
      const matchSearch = !s ||
        o.id?.toString().includes(s) ||
        (o.nome_vendedor || '').toLowerCase().includes(s) ||
        (o.nome_comprador || '').toLowerCase().includes(s);
      if (!matchSearch) return false;

      const status = (o.status || '').toLowerCase();
      const isVenda = o.venda === 'venda' || o.venda === true;
      const isCompra = o.compra === 'compra' || o.compra === true;

      switch (activeTab) {
        case 'vendas':
          return isVenda;
        case 'compras':
          return isCompra;
        case 'pendentes':
          return status === 'pendente' || status === 'pendentes';
        default:
          return true;
      }
    });
    return list;
  }, [orders, searchTerm, activeTab]);

  // Actions
  const withProcessing = async (id: number, action: string, fn: () => Promise<void>) => {
    try {
      setProcessingId(id);
      setProcessingAction(action);
      await fn();
      // Recarrega para garantir estado sincronizado com backend
      await fetchOrders();
    } catch (e: any) {
      Alert.alert('Erro', 'Não foi possível processar a ação.');
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleAccept = (orderId: number) =>
    withProcessing(orderId, 'aceitar', async () => {
      await postJson(`/pedidos/${orderId}/confirmar/`, {}, { headers: { Authorization: `Bearer ${token}` } });
    });

  const handleReject = (orderId: number) =>
    withProcessing(orderId, 'rejeitar', async () => {
      await putJson(`/pedidos/${orderId}/recusar`, {}, { headers: { Authorization: `Bearer ${token}` } });
    });

  const handleCancel = (orderId: number) =>
    withProcessing(orderId, 'cancelar', async () => {
      await putJson(`/pedidos/${orderId}/cancelar`, {}, { headers: { Authorization: `Bearer ${token}` } });
    });

  const handleConfirmRecebimento = (orderId: number) =>
    withProcessing(orderId, 'confirmar_recebimento', async () => {
      await putJson(`/pedidos/${orderId}/confirmar-recebimento`, {}, { headers: { Authorization: `Bearer ${token}` } });
    });

  const handleConfirmEntrega = (orderId: number) => {
    // Na Web abre modal na página de detalhes. Aqui navegamos para uma tela de detalhes (futura)
    router.push({ pathname: '/pedido/[orderId]', params: { orderId: String(orderId) } });
  };

  const renderCard = ({ item }: { item: Order }) => {
    const status = (item.status || '').toLowerCase();
    const isVenda = item.venda === 'venda' || item.venda === true;
    const isCompra = item.compra === 'compra' || item.compra === true;
    const isProcessing = processingId === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/pedido/[orderId]', params: { orderId: String(item.id) } })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Pedido #{item.id}</Text>
          <View style={[styles.statusPill, statusStyles(status)]}>
            <Text style={styles.statusText}>{item.status || '—'}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8, gap: 4 }}>
          {!!item.nome_vendedor && (
            <Text style={styles.metaText}>Vendedor: {item.nome_vendedor}</Text>
          )}
          {!!item.nome_comprador && (
            <Text style={styles.metaText}>Comprador: {item.nome_comprador}</Text>
          )}
          {typeof item.total === 'number' && (
            <Text style={styles.metaText}>Total: {formatCurrency(item.total)}</Text>
          )}
          <Text style={styles.metaText}>Tipo: {isVenda ? 'Venda' : isCompra ? 'Compra' : '—'}</Text>
        </View>

        <View style={styles.actionsRow}>
          {/* Pendentes: aceitar/rejeitar (vendedor) ou cancelar (comprador) */}
          {(status === 'pendente' || status === 'pendentes') && !item.aceito_pelo_vendedor && (
            isCompra ? (
              <ActionBtn label="Cancelar" color="#DC2626" onPress={() => handleCancel(item.id)} loading={isProcessing && processingAction === 'cancelar'} />
            ) : (
              <>
                <ActionBtn label="Aceitar" color="#10B981" onPress={() => handleAccept(item.id)} loading={isProcessing && processingAction === 'aceitar'} />
                <ActionBtn label="Rejeitar" color="#F59E0B" onPress={() => handleReject(item.id)} loading={isProcessing && processingAction === 'rejeitar'} />
              </>
            )
          )}

          {/* Aceite: vendedor confirma entrega; comprador pode cancelar */}
          {status === 'aceite' && (
            <>
              {user?.id_unico && user.id_unico === item.id_vendedor && (
                <ActionBtn label="Confirmar Entrega" color="#16A34A" onPress={() => handleConfirmEntrega(item.id)} loading={false} />
              )}
              {user?.id_unico && user.id_unico === item.id_comprador && (
                <ActionBtn label="Cancelar" color="#DC2626" onPress={() => handleCancel(item.id)} loading={isProcessing && processingAction === 'cancelar'} />
              )}
            </>
          )}

          {/* Aguardando confirmação: comprador confirma recebimento */}
          {status === 'aguardando_confirmacao' && user?.id_unico === item.id_comprador && (
            <ActionBtn label="Confirmar Recebimento" color="#2563EB" onPress={() => handleConfirmRecebimento(item.id)} loading={isProcessing && processingAction === 'confirmar_recebimento'} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Pedidos</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Busca */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          placeholder="Buscar por ID, vendedor ou comprador..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
        />
      </View>

      {/* Abas */}
      <View style={styles.tabsRow}>
        {(['todos', 'vendas', 'compras', 'pendentes'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{labelTab(tab)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo */}
      <View style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <View style={{ padding: 12, gap: 10 }}>
            {[1,2,3].map(i => (
              <View key={i} style={styles.cardSkeleton}>
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#E5E7EB' }} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ height: 14, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 6 }} />
                  <View style={{ height: 12, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 6 }} />
                </View>
              </View>
            ))}
            <ActivityIndicator color="#8b5cf6" />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="inbox" size={42} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
            <Text style={styles.emptySub}>Tente outros termos ou filtros</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
          />
        )}
      </View>
    </View>
  );
}

// Small components and helpers
function labelTab(tab: 'todos'|'vendas'|'compras'|'pendentes') {
  switch (tab) {
    case 'vendas': return 'Vendas';
    case 'compras': return 'Compras';
    case 'pendentes': return 'Pendentes';
    default: return 'Todos';
  }
}

function statusStyles(status: string) {
  const s = status.toLowerCase();
  if (s.includes('pend')) return { backgroundColor: '#FEF3C7' };
  if (s.includes('aceit') || s.includes('aguard')) return { backgroundColor: '#DBEAFE' };
  if (s.includes('conc')) return { backgroundColor: '#DCFCE7' };
  if (s.includes('cancel') || s.includes('recus')) return { backgroundColor: '#FEE2E2' };
  return { backgroundColor: '#F3F4F6' };
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return '—';
  try {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  } catch {
    return `${value}`;
  }
}

const ActionBtn = ({ label, color, onPress, loading }: { label: string; color: string; onPress: () => void; loading?: boolean }) => (
  <TouchableOpacity style={[styles.actionBtn, { borderColor: color, backgroundColor: `${color}20` }]} onPress={onPress} disabled={!!loading}>
    {loading ? (
      <ActivityIndicator color={color} />
    ) : (
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 12 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', margin: 12, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FAFAFA' },
  searchInput: { flex: 1, color: '#111827', paddingVertical: 4 },

  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 8 },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#EEF2FF' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#8b5cf6' },

  cardSkeleton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },

  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  metaText: { fontSize: 13, color: '#374151' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 12 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  actionText: { fontWeight: '700' },
});