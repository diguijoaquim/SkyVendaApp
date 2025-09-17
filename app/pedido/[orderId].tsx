import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getJson, postJson } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

// Minimal type for order details; adjust as your API returns
type Order = {
  id: number;
  status?: string;
  id_vendedor?: string;
  id_comprador?: string;
  nome_vendedor?: string;
  nome_comprador?: string;
  total?: number;
};

export default function PedidoDetailScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  const load = async () => {
    if (!token) {
      setError('Usuário não autenticado');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getJson<Order>(`/pedidos/${orderId}/`, { headers: { Authorization: `Bearer ${token}` } });
      setOrder(data ?? null);
      setError(null);
    } catch (e) {
      setError('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  const confirmarEntrega = async () => {
    if (!token || !orderId) return;
    try {
      setSaving(true);
      await postJson(`/pedidos/${orderId}/confirmar-entrega/`, null, {
        params: { codigo: codeInput },
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
      Alert.alert('Sucesso', 'Entrega confirmada.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível confirmar a entrega.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedido #{orderId}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color="#4F46E5" />
        ) : error ? (
          <Text style={{ color: '#DC2626' }}>{error}</Text>
        ) : !order ? (
          <Text>Pedido não encontrado.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.row}>Status: {order.status ?? '—'}</Text>
            <Text style={styles.row}>Vendedor: {order.nome_vendedor ?? '—'}</Text>
            <Text style={styles.row}>Comprador: {order.nome_comprador ?? '—'}</Text>
            <Text style={styles.row}>Total: {typeof order.total === 'number' ? order.total : '—'}</Text>
            <Text style={[styles.row, { marginTop: 8 }]}>Código de confirmação</Text>
            <TextInput
              placeholder="Introduza o código"
              value={codeInput}
              onChangeText={setCodeInput}
              style={styles.input}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: saving ? 0.7 : 1 }]}
              disabled={saving}
              onPress={confirmarEntrega}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Confirmar Entrega</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 12 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  card: { gap: 10, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  row: { fontSize: 14, color: '#111827' },
  input: { marginTop: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#111827', backgroundColor: '#FAFAFA' },
  primaryBtn: { marginTop: 8, borderRadius: 8, backgroundColor: '#16A34A', paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
