import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { getJson } from '@/services/api';
import { useRouter } from 'expo-router';
import { HomeContext } from '@/contexts/HomeContext';

type Nhonguista = {
  id: number;
  username: string;
  name: string;
  foto_perfil?: string;
  avaliacao_media?: string | number;
  seguidores?: number;
  segue_usuario?: boolean;
  is_loja?: boolean;
};

export default function FriendsScreen() {
  const [nhonguistas, setNhonguistas] = useState<Nhonguista[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'nhonguistas' | 'lojas'>('nhonguistas');
  const router = useRouter();
  const {sellers, setSellers}=useContext(HomeContext)

  useEffect(() => {
    fetchNhonguistas();
  }, []);

  const fetchNhonguistas = async () => {
    setLoading(true);
    try {
      const res = await getJson<any>('/usuario/usuarios/lojas?skip=0&limit=20');
      const list: any[] = res?.usuarios || res || [];
      const mapped: Nhonguista[] = list.map((u, idx) => ({
        id: u.id ?? u.usuario_id ?? idx,
        username: u.username ?? u.identificador_unico ?? `user_${idx}`,
        name: u.nome ?? u.name ?? u.username ?? '—',
        foto_perfil: u.foto_perfil ?? u.avatar ?? u.foto ?? undefined,
        avaliacao_media: u.avaliacao_media ?? u.rating ?? 0,
        seguidores: u.seguidores ?? u.followers ?? 0,
        segue_usuario: !!u.segue_usuario,
        is_loja: !!u.is_loja,
      }));
      setNhonguistas(mapped);
      setSellers(mapped)
    } catch (e) {
      console.warn('Erro ao buscar nhonguistas');
      setNhonguistas([]);
      
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = (nhonguistaId: number) => {
    // TODO: Chamar API real de seguir/deixar de seguir. Aqui apenas alterna localmente.
    setNhonguistas(prev => prev.map(n => n.id === nhonguistaId ? { ...n, segue_usuario: !n.segue_usuario } : n));
  };

  const dataFiltrada = nhonguistas.filter(n => activeTab === 'nhonguistas' ? !n.is_loja : !!n.is_loja);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nhonguistas e Lojas</Text>
        <Text style={styles.headerSubtitle}>Encontre os melhores vendedores</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('nhonguistas')}>
          <View style={styles.tabInner}>
            <Feather name="users" size={18} color={activeTab === 'nhonguistas' ? '#4F46E5' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'nhonguistas' ? styles.tabTextActive : undefined]}>Nhonguistas</Text>
          </View>
          {activeTab === 'nhonguistas' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('lojas')}>
          <View style={styles.tabInner}>
            <Ionicons name="storefront-outline" size={18} color={activeTab === 'lojas' ? '#4F46E5' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'lojas' ? styles.tabTextActive : undefined]}>Lojas</Text>
          </View>
          {activeTab === 'lojas' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={{ gap: 12 }}>
            {[1,2,3,4,5].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skelRow}>
                  <View style={styles.skelAvatar} />
                  <View style={styles.skelTextCol}>
                    <View style={styles.skelLineLg} />
                    <View style={styles.skelLineSm} />
                  </View>
                </View>
              </View>
            ))}
            <ActivityIndicator color="#4F46E5" />
          </View>
        ) : dataFiltrada.length > 0 ? (
          <View style={{ gap: 12 }}>
            {dataFiltrada.map(n => (
              <TouchableOpacity key={n.id} style={styles.card} onPress={() => router.push({ pathname: '/(profile)/[username]', params: { username: n.username } })}>
                <View style={styles.cardRow}>
                  <Image
                    source={{ uri: n.foto_perfil || 'https://via.placeholder.com/64' }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{n.name}</Text>
                    <Text style={styles.username}>@{n.username}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.ratingText}>{n.avaliacao_media ?? '0.0'}</Text>
                      <Text style={styles.followersText}>{n.seguidores ?? 0} seguidores</Text>
                    </View>
                  </View>
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => {/* router.push(`/chat`) */}}>
                      <Feather name="message-circle" size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconBtn, n.segue_usuario ? styles.iconBtnActive : undefined]} onPress={() => handleFollow(n.id)}>
                      {n.segue_usuario ? (
                        <Feather name="user-check" size={20} color="#4F46E5" />
                      ) : (
                        <Feather name="user-plus" size={20} color="#4B5563" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              {activeTab === 'nhonguistas' ? (
                <Feather name="users" size={32} color="#9CA3AF" />
              ) : (
                <Ionicons name="storefront-outline" size={32} color="#9CA3AF" />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'nhonguistas' ? 'Nenhum nhonguista encontrado' : 'Nenhuma loja encontrada'}
            </Text>
            <Text style={styles.emptySubtitle}>Tente novamente mais tarde</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 12 },
  tabInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabText: { fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#4F46E5' },
  tabIndicator: { height: 2, backgroundColor: '#4F46E5', marginTop: 8 },
  content: { padding: 16 },
  skeletonCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  skelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skelAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB' },
  skelTextCol: { flex: 1, gap: 8 },
  skelLineLg: { height: 16, width: '75%', backgroundColor: '#E5E7EB', borderRadius: 6 },
  skelLineSm: { height: 12, width: '50%', backgroundColor: '#E5E7EB', borderRadius: 6 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  username: { fontSize: 12, color: '#6B7280' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  followersText: { fontSize: 10, color: '#9CA3AF', marginLeft: 8 },
  iconBtn: { padding: 8, borderRadius: 999, backgroundColor: '#F3F4F6' },
  iconBtnActive: { backgroundColor: '#EEF2FF' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: '#6B7280' },
});
