import React, { useEffect, useState } from 'react'
import { Image, Text, View, ScrollView, TouchableOpacity } from 'react-native'
import ContentLoader, { Circle, Rect } from '@/components/skeletons/ContentLoader'
import { getJson } from '@/services/api'
import { useRouter } from 'expo-router'

type Vendedor = {
  id?: string | number
  username?: string
  identificador_unico?: string
  nome?: string
  name?: string
  foto_perfil?: string
  avatar?: string
  foto?: string
}

export default function Nhonguistas() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await getJson<any>('/usuario/usuarios/lojas?skip=0&limit=10')
        console.log('Nhonguistas: raw response =>', res)
        if (!mounted) return
        let list: any[] = []
        if (Array.isArray(res)) list = res
        else if (res?.usuarios && Array.isArray(res.usuarios)) list = res.usuarios
        else if (res?.data?.usuarios && Array.isArray(res.data.usuarios)) list = res.data.usuarios
        setVendedores(list as Vendedor[])
      } catch (e) {
        console.log('Nhonguistas: error loading vendedores', e)
        setVendedores([])
      } finally {
        mounted && setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const renderSkeleton = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
      {[0,1,2,3,4].map((k) => (
        <View key={k} style={{ width: 90, marginRight: 12 }}>
          <ContentLoader
            speed={1.6}
            width={90}
            height={110}
            viewBox='0 0 90 110'
            backgroundColor='#f0f0f0'
            foregroundColor='#dedede'
          >
            <Circle cx='45' cy='40' r='38' />
            <Rect x='10' y='85' rx='4' ry='4' width='70' height='12' />
          </ContentLoader>
        </View>
      ))}
    </ScrollView>
  )

  const renderList = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
      {vendedores.map((v, idx) => {
        const key = String(v.id ?? v.username ?? v.identificador_unico ?? idx)
        const avatar = v.foto_perfil || v.avatar || v.foto || undefined
        const nome = v.nome || v.name || v.username || v.identificador_unico || '—'
        const profileUsername = v.username || v.identificador_unico || (v.id != null ? String(v.id) : '')

        const goToProfile = () => {
          if (!profileUsername) return
          router.push({ pathname: '/(profile)/[username]', params: { username: profileUsername } })
        }
        return (
          <View key={key} style={{ width: 90, marginRight: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
              <Image
                source={avatar ? { uri: avatar } : undefined}
                style={{ width: 80, height: 80 }}
                className='border-violet-500 border-2 rounded-full'
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToProfile} activeOpacity={0.7}>
              <Text numberOfLines={1} style={{ marginTop: 6, maxWidth: 90 }} className='text-neutral-800 text-xs font-medium'>
                {nome}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })}
    </ScrollView>
  )

  if (!loading && !vendedores.length) return null

  return (
    <View className='m-3'>
      <Text className='text-violet-500 font-bold mb-3'>nhonguistas</Text>
      {loading ? renderSkeleton() : renderList()}
    </View>
  )
}