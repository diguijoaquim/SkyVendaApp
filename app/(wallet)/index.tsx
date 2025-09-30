import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader';
import { useAuth } from '@/contexts/AuthContext';
import { getJson, postJson } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
interface WalletData {
  id?: number | null;
  identificador_unico?: string | null;
  saldo_principal: number;
  saldo_congelado: number;
}

function formatMZN(value?: number) {
  if (typeof value !== 'number' || isNaN(value)) return '0,00 MZN';
  try { 
    return new Intl.NumberFormat('pt-MZ', { 
      style: 'currency', 
      currency: 'MZN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value); 
  } catch { 
    return `${value.toFixed(2)} MZN`; 
  }
}

export default function SkyWalletScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

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
      {/* AppBar - transparent with violet bottom border */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b-2 border-violet-600">
        <TouchableOpacity onPress={() => router.back()} className="w-8 h-8 items-center justify-center">
          <Ionicons name="chevron-back" size={22} color="#4F46E5" />
        </TouchableOpacity>
        <Text className="text-violet-700 text-lg font-bold">SkyWallet</Text>
        <View className="w-8 h-8 items-center justify-center">
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} className="w-8 h-8 rounded-full border-2 border-violet-500" />
          ) : (
            <Ionicons name="person-circle-outline" size={28} color="#4F46E5" />
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="px-4 pt-3">
        <View className="flex-row gap-2 flex-wrap">
          {[
            { k: 'wallet', t: 'Carteira' },
            { k: 'deposit', t: 'Depósito' },
            { k: 'withdraw', t: 'Levantamento' },
            { k: 'methods', t: 'Métodos' },
          ].map((tab: any) => (
            <TouchableOpacity
              key={tab.k}
              onPress={() => setActiveTab(tab.k)}
              className={`py-1.5 px-3 rounded-full ${activeTab===tab.k ? 'bg-violet-100' : 'bg-gray-100'}`}
            >
              <Text className={`${activeTab===tab.k ? 'text-violet-700' : 'text-gray-600'} font-semibold`}>{tab.t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Skeleton: Tabs spacing */}
          <View className="px-4 pt-3">
            <View className="flex-row gap-2">
              <View className="h-8 w-24 rounded-full bg-gray-200" />
              <View className="h-8 w-24 rounded-full bg-gray-200" />
              <View className="h-8 w-28 rounded-full bg-gray-200" />
            </View>
          </View>

          {/* Skeleton: Balance Card */}
          <View className="px-4 mt-3">
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
          <View className="px-4 mt-4">
            <View className="grid grid-cols-2 gap-3">
              <View className="h-24 rounded-xl bg-gray-200" />
              <View className="h-24 rounded-xl bg-gray-200" />
            </View>
          </View>

          {/* Skeleton: Form card */}
          <View className="px-4 mt-4">
            <ContentLoader speed={1.6} width={'100%'} height={170} viewBox="0 0 360 170" backgroundColor="#f0f0f0" foregroundColor="#dedede">
              <Rect x="0" y="0" rx="12" ry="12" width="360" height="170" />
              <Rect x="16" y="16" rx="4" ry="4" width="140" height="12" />
              <Rect x="16" y="36" rx="8" ry="8" width="328" height="40" />
              <Rect x="16" y="84" rx="4" ry="4" width="120" height="12" />
              <Rect x="16" y="104" rx="8" ry="8" width="328" height="40" />
              <Rect x="16" y="150" rx="8" ry="8" width="180" height="14" />
            </ContentLoader>
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
          {error && (
            <View className="bg-red-50 border border-red-200 mx-4 mt-3 p-3 rounded-lg">
              <Text className="text-red-700">{error}</Text>
            </View>
          )}

          {activeTab === 'wallet' && (
            <View className="px-4 mt-3" style={{ gap: 16 }}>
              {/* Balance Card */}
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6']} // violet-600 to violet-500
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 20 }}
              >
                <Text className="text-white/80">Saldo disponível</Text>
                <Text className="text-white text-3xl font-extrabold mt-1">{formatMZN(balance)}</Text>
                <View className="flex-row items-center justify-between mt-3">
                  <View className="bg-white/10 rounded-lg px-3 py-2">
                    <Text className="text-white text-xs">Congelado</Text>
                    <Text className="text-white font-semibold">{formatMZN(frozen)}</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity onPress={() => setActiveTab('deposit')} className="bg-white/90 rounded-full px-4 py-2">
                      <Text className="text-violet-700 font-bold">Depositar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setActiveTab('withdraw')} className="bg-white/20 rounded-full px-4 py-2 border border-white/40">
                      <Text className="text-white font-bold">Levantar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>

              {/* Quick Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={() => setActiveTab('deposit')} className="flex-1 bg-violet-50 border border-violet-200 rounded-xl p-4 items-center">
                  <Ionicons name="arrow-down-circle" size={26} color="#4F46E5" />
                  <Text className="text-violet-700 font-medium mt-2">Depósito</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('withdraw')} className="flex-1 bg-violet-50 border border-violet-200 rounded-xl p-4 items-center">
                  <Ionicons name="arrow-up-circle" size={26} color="#4F46E5" />
                  <Text className="text-violet-700 font-medium mt-2">Levantamento</Text>
                </TouchableOpacity>
              </View>
              
              {/* Transfer Button */}
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6']} // violet-600 to violet-500
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, padding: 8, alignItems: 'center' }}
              >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="swap-horizontal" size={26} color="#FFFFFF" />
                  <Text className="text-white font-medium">Transferir</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {activeTab === 'deposit' && (
            <View className="px-4 mt-4" style={{ gap: 16 }}>
              <Text className="text-lg font-bold text-gray-800">Depósito</Text>
              <View className="bg-white rounded-xl border border-gray-200 p-4" style={{ gap: 12 }}>
                <View>
                  <Text className="text-gray-700 mb-1">Valor (MZN)</Text>
                  <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900" placeholder="0.00" placeholderTextColor="#9CA3AF" />
                </View>
                <View>
                  <Text className="text-gray-700 mb-1">Referência</Text>
                  <TextInput value={reference} onChangeText={setReference} className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900" placeholder="Ex.: Mpesa/Emola/Conta" placeholderTextColor="#9CA3AF" />
                </View>
                <TouchableOpacity onPress={handleDeposit} className="bg-violet-600 rounded-lg py-3 items-center">
                  <Text className="text-white font-bold">Confirmar Depósito</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'withdraw' && (
            <View className="px-4 mt-4" style={{ gap: 16 }}>
              <Text className="text-lg font-bold text-gray-800">Levantamento</Text>
              <View className="bg-white rounded-xl border border-gray-200 p-4" style={{ gap: 12 }}>
                <View>
                  <Text className="text-gray-700 mb-1">Valor (MZN)</Text>
                  <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900" placeholder="0.00" placeholderTextColor="#9CA3AF" />
                </View>
                <View>
                  <Text className="text-gray-700 mb-1">Referência</Text>
                  <TextInput value={reference} onChangeText={setReference} className="border border-gray-200 rounded-lg px-3 py-2 text-gray-900" placeholder="Ex.: IBAN/Carteira Móvel" placeholderTextColor="#9CA3AF" />
                </View>
                <TouchableOpacity onPress={handleWithdraw} className="bg-violet-600 rounded-lg py-3 items-center">
                  <Text className="text-white font-bold">Solicitar Levantamento</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'methods' && (
            <View className="px-4 mt-4" style={{ gap: 12 }}>
              <Text className="text-lg font-bold text-gray-800">Métodos de Pagamento</Text>
              <View className="bg-white rounded-xl border border-gray-200 p-4" style={{ gap: 8 }}>
                <Text className="text-gray-700">• Mpesa</Text>
                <Text className="text-gray-700">• Emola</Text>
                <Text className="text-gray-700">• PayPal</Text>
                <Text className="text-gray-500 mt-2">Em breve: cartões e outros provedores.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
