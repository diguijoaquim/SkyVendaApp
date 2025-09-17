import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { postJson } from '@/services/api';

const PRICING = {
  ofertas_diarias: { price: 100, label: 'Oferta Diária', value: 'ofertas_diarias' },
  melhores_boladas: { price: 150, label: 'Melhores Boladas', value: 'melhores_boladas' },
  para_si: { price: 80, label: 'Para Si', value: 'para_si' },
} as const;

type Tipo = keyof typeof PRICING;

function formatCurrency(value: number) {
  try { return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value); } catch { return `${value}`; }
}

export default function AnunciarProdutoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dias, setDias] = useState('1');
  const [tipo, setTipo] = useState<Tipo>('ofertas_diarias');
  const [saving, setSaving] = useState(false);

  const pricePerDay = PRICING[tipo].price;
  const total = useMemo(() => pricePerDay * (parseInt(dias, 10) || 1), [pricePerDay, dias]);

  const handleSubmit = async () => {
    if (!token) { Alert.alert('Erro', 'Usuário não autenticado'); return; }
    try {
      setSaving(true);
      await postJson(`/produtos/promover`, {
        titulo, descricao, dias: parseInt(dias, 10) || 1, tipo, produto_id: parseInt(id, 10),
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Sucesso', 'Produto promovido com sucesso');
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível promover');
    } finally { setSaving(false); }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Turbinar a bolada</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <LabeledInput label="Título do anúncio" value={titulo} onChangeText={setTitulo} />
        <LabeledInput label="Descrição do anúncio" value={descricao} onChangeText={setDescricao} multiline />

        <View>
          <Text style={styles.label}>Duração (dias)</Text>
          <TextInput style={styles.input} value={dias} onChangeText={setDias} keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
        </View>

        <View>
          <Text style={styles.label}>Posicionamento</Text>
          <View style={styles.rowButtons}>
            {Object.keys(PRICING).map((key) => (
              <TouchableOpacity key={key} onPress={() => setTipo(key as Tipo)} style={[styles.choiceBtn, tipo===key && styles.choiceBtnActive]}>
                <Text style={[styles.choiceText, tipo===key && styles.choiceTextActive]}>{PRICING[key as Tipo].label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Row label="Preço por dia" value={formatCurrency(pricePerDay)} />
          <Row label="Duração" value={`${dias} ${parseInt(dias,10)===1?'dia':'dias'}`} />
          <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />
          <Row label="Total" value={formatCurrency(total)} bold />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Turbinar Agora</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[styles.rowText, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.rowText, bold && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function LabeledInput({ label, multiline, style, ...props }: any) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 100, textAlignVertical: 'top' }, style]}
        placeholderTextColor="#9CA3AF"
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4F46E5', paddingHorizontal: 12, paddingVertical: 12 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  label: { color: '#374151', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FAFAFA', color: '#111827' },

  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  choiceBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  choiceText: { color: '#374151', fontWeight: '600' },
  choiceTextActive: { color: '#4F46E5' },

  summaryBox: { gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#F9FAFB' },
  rowText: { color: '#111827' },

  primaryBtn: { marginTop: 8, borderRadius: 8, backgroundColor: '#4F46E5', paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
