import React, { useState, useEffect } from 'react'
import { Text, View, ScrollView, Image, TouchableOpacity } from 'react-native'
import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader'
import axios from 'axios'

type Product = {
  id: number
  nome: string
  capa: string
}

type Props = { loading?: boolean }

export default function News({ loading = false }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
            <View key={k} className='rounded-md' style={{ width: 100, marginRight: 8 }}>
              <ContentLoader
                speed={1.6}
                width={100}
                height={180}
                viewBox='0 0 100 180'
                backgroundColor='#f0f0f0'
                foregroundColor='#dedede'
              >
                {/* Image rectangle */}
                <Rect x='0' y='0' rx='8' ry='8' width='100' height='120' />
                {/* Title bar */}
                <Rect x='8' y='130' rx='4' ry='4' width='84' height='10' />
              </ContentLoader>
            </View>
          ))
        ) : (
          // Actual products
          products.map((product) => (
            <TouchableOpacity 
              key={product.id} 
              className='rounded-md' 
              style={{ width: 100, marginRight: 8 }}
            >
              <Image
                source={{ uri: product.capa }}
                className='w-full h-30 rounded-lg'
                style={{ width: 100, height: 120 }}
                resizeMode='cover'
              />
              <Text 
                className='text-sm font-medium mt-2 text-gray-800'
                numberOfLines={2}
                style={{ width: 100 }}
              >
                {product.nome}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}