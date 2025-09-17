import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getJson } from '@/services/api';
import axios from 'axios';
import { BASE_URL } from '@/services/api';

export default function EditProductScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [estado, setEstado] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  const load = async () => {
    if (!token) { setError('Usuário não autenticado'); setLoading(false); return; }
    try {
      setLoading(true);
      // Try to fetch product details by slug
      const res = await getJson<any>(`/produtos/${slug}`, { headers: { Authorization: `Bearer ${token}` } });
      const p = res || {};
      setProductName(p.title || p.nome || '');
      setPrice(String(p.price ?? p.preco ?? ''));
      setCategory(p.category || p.categoria || '');
      setStock(String(p.stock ?? p.quantidade_estoque ?? ''));
      setEstado(p.estado || '');
      setType(p.type || p.tipo || '');
      setDescription(p.description || p.descricao || '');
      setContent(p.content || p.detalhes || '');
      setError(null);
    } catch (e: any) {
      // If GET fails, allow editing fields manually
      setError('Não foi possível carregar detalhes do produto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug, token]);

  const handleSave = async () => {
    if (!token) return;
    try {
      setSaving(true);
      const form = new FormData();
      form.append('nome', productName);
      if (price) form.append('preco', parseFloat(price) as any);
      if (stock) form.append('quantidade_estoque', parseInt(stock, 10) as any);
      if (estado) form.append('estado', estado);
      form.append('disponiblidade', 'string');
      if (description) form.append('descricao', description);
      if (content) form.append('detalhes', content);
      if (type) form.append('tipo', type);
      if (category) form.append('categoria', category);

      await axios.put(`${BASE_URL}produtos/${slug}`, form as any, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Sucesso', 'Produto atualizado com sucesso');
      router.back();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível atualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Produto</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><ActivityIndicator color="#4F46E5" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {error && <Text style={{ color: '#DC2626' }}>{error}</Text>}
          <LabeledInput label="Nome do Produto" value={productName} onChangeText={setProductName} />
          <LabeledInput label="Preço" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <LabeledInput label="Categoria" value={category} onChangeText={setCategory} />
          <LabeledInput label="Subcategoria" value={type} onChangeText={setType} />
          <LabeledInput label="Quantidade em Estoque" value={stock} onChangeText={setStock} keyboardType="number-pad" />
          <LabeledInput label="Estado" value={estado} onChangeText={setEstado} placeholder="Novo / Bolada / Seminovo" />
          <LabeledInput label="Detalhes" value={content} onChangeText={setContent} multiline />
          <LabeledInput label="Descrição" value={description} onChangeText={setDescription} multiline />

          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Salvar Alterações</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
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
  primaryBtn: { marginTop: 8, borderRadius: 8, backgroundColor: '#4F46E5', paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
