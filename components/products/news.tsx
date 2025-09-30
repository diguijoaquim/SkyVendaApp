import React, { useState, useEffect } from 'react'
import { Text, View, ScrollView, Image, TouchableOpacity } from 'react-native'
import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader'
import axios from 'axios'
import { useRouter } from 'expo-router'

type Product = {
  id: number
  nome: string
  capa: string
  price?: number
  preco?: number
  slug?: string
}

type Props = { loading?: boolean }

export default function News({ loading = false }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const shuffleArray = (array: Product[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get('https://skyvendas-production.up.railway.app/produtos/destaques/?limit=10')
      const shuffledProducts = shuffleArray(response.data.produtos)
      setProducts(shuffledProducts)
    } catch (error) {
      console.error('Erro ao buscar produtos destacados:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className='m-3'>
      <Text className='text-violet-500 font-bold mb-2'>Novidades</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
        {isLoading || loading ? (
          // Loading skeleton
          [0, 1, 2, 3].map((k) => (
            <View key={k} className='rounded-md' style={{ width: 120, marginRight: 10 }}>
              <ContentLoader
                speed={1.6}
                width={120}
                height={190}
                viewBox='0 0 120 190'
                backgroundColor='#f0f0f0'
                foregroundColor='#dedede'
              >
                {/* Image rectangle */}
                <Rect x='0' y='0' rx='10' ry='10' width='120' height='140' />
                {/* Title bar */}
                <Rect x='8' y='150' rx='4' ry='4' width='100' height='12' />
              </ContentLoader>
            </View>
          ))
        ) : (
          // Actual products
          products.map((product) => {
            const displayPrice = product.price ?? product.preco
            const priceText = typeof displayPrice === 'number'
              ? new Intl.NumberFormat('pt-MZ', { style: 'decimal', minimumFractionDigits: 2 }).format(displayPrice)
              : null
            return (
              <TouchableOpacity 
                key={product.id} 
                className='rounded-md'
                style={{ width: 120, marginRight: 10 }}
                onPress={() => {
                  if (product.slug) {
                    router.push({ pathname: '/product/[slug]', params: { slug: String(product.slug) } })
                  }
                }}
                activeOpacity={0.9}
              >
                <View
                  style={{
                    width: 120,
                    height: 140,
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    borderWidth: 1,
                    borderColor: '#E5E7EB', // gray-200
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Image
                    source={{ uri: product.capa }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode='cover'
                  />
                  {/* Novo badge */}
                  <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>NOVO</Text>
                  </View>
                  {/* Price pill */}
                  {priceText ? (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        backgroundColor: '#6D28D9', // brand violet, stronger than badge
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 10,
                        shadowColor: '#000',
                        shadowOpacity: 0.25,
                        shadowRadius: 3,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 3,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '900' }}>MT {priceText}</Text>
                    </View>
                  ) : null}
                </View>
                <Text 
                  className='text-sm font-semibold mt-2 text-gray-900'
                  numberOfLines={2}
                  style={{ width: 120 }}
                >
                  {product.nome}
                </Text>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}