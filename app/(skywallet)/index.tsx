import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader';
import { useAuth } from '@/contexts/AuthContext';
import { getJson, postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WalletData {
  id?: number | null;
  identificador_unico?: string | null;
  saldo_principal: number;
  saldo_congelado: number;
}

function formatMZN(value?: number) {
  if (typeof value !== 'number') return '0,00 MT';
  try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value} MT`; }
}

export default function SkyWalletScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'wallet'|'deposit'|'withdraw'|'methods'>('wallet');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletData>({ saldo_principal: 0, saldo_congelado: 0 });

  // Simple form states
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const loadWallet = async () => {
    if (!token) { setError('Usuário não autenticado'); setLoading(false); return; }
    try {
      setLoading(true);
      // Endpoint placeholder — adjust to real API when available
      const res = await getJson<any>('/wallet/carteira', { headers: { Authorization: `Bearer ${token}` } });
      const card = res?.carteira || res || {};
      setData({
        id: card.id ?? null,
        identificador_unico: card.identificador_unico ?? null,
        saldo_principal: Number(card.saldo_principal ?? 0),
        saldo_congelado: Number(card.saldo_congelado ?? 0),
      });
      setError(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || e?.message;
      if (status === 404) {
        setData({ saldo_principal: 0, saldo_congelado: 0 });
        setError(null);
      } else {
        setError(detail ? `Erro ao carregar carteira${status ? ` (HTTP ${status})` : ''}: ${String(detail)}` : 'Erro ao carregar carteira');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWallet(); }, [token]);

  const handleDeposit = async () => {
    if (!token) { Alert.alert('Erro', 'Usuário não autenticado'); return; }
    if (!amount) { Alert.alert('Atenção', 'Informe o valor'); return; }
    try {
      // Placeholder endpoint
      await postJson('/wallet/depositar', { valor: parseFloat(amount), referencia: reference }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Sucesso', 'Depósito iniciado');
      setAmount(''); setReference('');
      loadWallet();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.detail || e?.message || 'Falha ao depositar');
    }
  };

  const handleWithdraw = async () => {
    if (!token) { Alert.alert('Erro', 'Usuário não autenticado'); return; }
    if (!amount) { Alert.alert('Atenção', 'Informe o valor'); return; }
    try {
      // Placeholder endpoint
      await postJson('/wallet/levantar', { valor: parseFloat(amount), referencia: reference }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Sucesso', 'Pedido de levantamento enviado');
      setAmount(''); setReference('');
      loadWallet();
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.detail || e?.message || 'Falha ao levantar');
    }
  };

  const balance = data.saldo_principal || 0;
  const frozen = data.saldo_congelado || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>SkyWallet</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { k: 'wallet', t: 'Carteira' },
            { k: 'deposit', t: 'Depósito' },
            { k: 'withdraw', t: 'Levantamento' },
            { k: 'methods', t: 'Métodos' },
          ].map((tab: any) => (
            <TouchableOpacity
              key={tab.k}
              onPress={() => setActiveTab(tab.k)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: activeTab === tab.k ? '#f3e8ff' : '#f3f4f6'
              }}
            >
              <Text style={{
                color: activeTab === tab.k ? '#7c3aed' : '#4b5563',
                fontWeight: '600'
              }}>{tab.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Skeleton: Tabs spacing */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ height: 32, width: 96, borderRadius: 999, backgroundColor: '#f0f0f0', marginRight: 12 }} />
              <View style={{ height: 32, width: 112, borderRadius: 999, backgroundColor: '#f0f0f0' }} />
            </View>
          </View>

          {/* Skeleton: Balance Card */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <ContentLoader speed={1.6} width={'100%'} height={150} viewBox="0 0 360 150" backgroundColor="#f0f0f0" foregroundColor="#dedede">
              <Rect x="0" y="0" rx="16" ry="16" width="360" height="150" />
              <Rect x="20" y="20" rx="4" ry="4" width="140" height="14" />
              <Rect x="20" y="44" rx="6" ry="6" width="220" height="26" />
              <Rect x="20" y="90" rx="8" ry="8" width="120" height="44" />
              <Rect x="160" y="96" rx="16" ry="16" width="84" height="32" />
              <Rect x="254" y="96" rx="16" ry="16" width="86" height="32" />
            </ContentLoader>
          </View>

          {/* Skeleton: Quick Actions */}
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ height: 96, flex: 1, borderRadius: 12, backgroundColor: '#f0f0f0', marginRight: 8 }} />
              <View style={{ height: 96, flex: 1, borderRadius: 12, backgroundColor: '#f0f0f0', marginLeft: 8 }} />
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {error && (
            <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 8 }}>
              <Text style={{ color: '#b91c1c' }}>{error}</Text>
            </View>
          )}

          {activeTab === 'wallet' && (
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              {/* Balance Card */}
              <View style={{ backgroundColor: '#7c3aed', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Saldo disponível</Text>
                <Text style={{ color: '#ffffff', fontSize: 30, fontWeight: '800', marginTop: 4 }}>{formatMZN(balance)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>Congelado</Text>
                    <Text style={{ color: '#ffffff', fontWeight: '600' }}>{formatMZN(frozen)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setActiveTab('deposit')} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
                      <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>Depositar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('withdraw')} style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)' }}>
                      <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Levantar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setActiveTab('deposit')} style={{ backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 12, padding: 16, alignItems: 'center', flex: 1 }}>
                  <Ionicons name="arrow-down-circle" size={26} color="#4F46E5" />
                  <Text style={{ color: '#7c3aed', fontWeight: '500', marginTop: 8 }}>Depósito</Text>
                </TouchableOpacity>
                                  <TouchableOpacity onPress={() => setActiveTab('withdraw')} style={{ backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#c4b5fd', borderRadius: 12, padding: 16, alignItems: 'center', flex: 1 }}>
                    <Ionicons name="arrow-up-circle" size={26} color="#4F46E5" />
                    <Text style={{ color: '#7c3aed', fontWeight: '500', marginTop: 8 }}>Levantamento</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'deposit' && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Depósito</Text>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginTop: 12 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#374151', marginBottom: 4 }}>Valor (MZN)</Text>
                  <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#111827' }} placeholder="0.00" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#374151', marginBottom: 4 }}>Referência</Text>
                  <TextInput value={reference} onChangeText={setReference} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#111827' }} placeholder="Ex.: Mpesa/Emola/Conta" placeholderTextColor="#9CA3AF" />
                </View>
                <TouchableOpacity onPress={handleDeposit} style={{ backgroundColor: '#7c3aed', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Confirmar Depósito</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'withdraw' && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Levantamento</Text>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginTop: 12 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#374151', marginBottom: 4 }}>Valor (MZN)</Text>
                  <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#111827' }} placeholder="0.00" placeholderTextColor="#9CA3AF" />
                </View>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: '#374151', marginBottom: 4 }}>Referência</Text>
                  <TextInput value={reference} onChangeText={setReference} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#111827' }} placeholder="Ex.: IBAN/Carteira Móvel" placeholderTextColor="#9CA3AF" />
                </View>
                <TouchableOpacity onPress={handleWithdraw} style={{ backgroundColor: '#7c3aed', borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Solicitar Levantamento</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'methods' && (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937' }}>Métodos de Pagamento</Text>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, marginTop: 8 }}>
                <Text style={{ color: '#374151', marginBottom: 8 }}>• Mpesa</Text>
                <Text style={{ color: '#374151', marginBottom: 8 }}>• Emola</Text>
                <Text style={{ color: '#374151', marginBottom: 8 }}>• Conta Bancária</Text>
                <Text style={{ color: '#6b7280', marginTop: 8 }}>Em breve: cartões e outros provedores.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
