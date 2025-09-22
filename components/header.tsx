import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const newMessages = 9;
  const notifCount = 3;
  const cartCount = 3;

  return (
    <View style={styles.wrapper}>
      {/* Top Row - Marca e ações rápidas */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.brand} onPress={() => router.push('/home')}>
          <Image source={require('../assets/images/icon.png')} style={styles.logo} />
          <Text style={styles.brandText}>SkyVenda MZ</Text>
        </TouchableOpacity>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.roundBtn} onPress={() => router.push('/publish-product')}>
            <Feather name="plus" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={() => router.push('/search')}>
            <Feather name="search" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={() => router.push('/mobilemenu')}>
            <Feather name="menu" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Bottom Row - ícones com badges e botão Postar */}
      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={() => router.push('/home')}>
          <Ionicons
            name={isActive('/home') || isActive('/') ? 'home' : 'home-outline'}
            size={28}
            color={isActive('/home') || isActive('/')? '#8b5cf6' : '#374151'}
          />
        </TouchableOpacity>

        <View>
          <TouchableOpacity onPress={() => router.push('/(chat)')}>
            <Ionicons name='chatbubble-outline' size={28} color={isActive('/(chat)') ? '#8b5cf6' : '#374151'} />
          </TouchableOpacity>
          {newMessages > 0 && (
            <View style={[styles.badge, styles.badgeRight]}>
              <Text style={styles.badgeText}>{newMessages > 9 ? '+9' : newMessages}</Text>
            </View>
          )}
        </View>

        {/* Friends */}
        <TouchableOpacity onPress={() => router.push('/friends')}>
          <Feather name="user" size={28} color={isActive('/friends') ? '#8b5cf6' : '#374151'} />
        </TouchableOpacity>

        <View>
          <TouchableOpacity onPress={() => router.push('/notifications') }>
            <Ionicons
              name={isActive('/notifications') ? 'notifications' : 'notifications-outline'}
              size={28}
              color={isActive('/notifications') ? '#8b5cf6' : '#374151'}
            />
          </TouchableOpacity>
          {notifCount > 0 && (
            <View style={[styles.badge, styles.badgeRight]}>
              <Text style={styles.badgeText}>{notifCount}</Text>
            </View>
          )}
        </View>

        <View>
          <TouchableOpacity onPress={() => router.push('/pedidos') }>
            <Feather name="shopping-cart" size={28} color="#374151" />
          </TouchableOpacity>
          {cartCount > 0 && (
            <View style={[styles.badge, styles.badgeRight]}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 8 },
  brandText: { fontSize: 18, fontWeight: '700', color: '#7a4fed' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundBtn: {
    backgroundColor: '#FDE68A20',
    padding: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    backgroundColor: '#FAFAFA',
  },
  catPicker: { paddingVertical: 6, paddingHorizontal: 6 },
  catText: { color: '#374151' },
  divider: { width: 1, height: 24, backgroundColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 6, paddingHorizontal: 6 },
  searchBtn: {
    padding: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 14,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7a4fed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  postBtnText: { color: '#FFFFFF', fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeRight: {},
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
})