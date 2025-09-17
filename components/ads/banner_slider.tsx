import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader'
import { useHome } from '@/contexts/HomeContext'
import { getJson } from '@/services/api'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Linking, ListRenderItem, Pressable, StyleSheet, Text, View, Platform } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import axios from 'axios'

type Ad = { id: number; title: string; image: string; link?: string }

type RealAd = {
  id: number
  titulo: string
  descricao: string
  tipo_anuncio: string
  produto_id: number
  promovido_em: string
  expira_em: string
  ativo: boolean
  preco: number
  produto_nome: string
  produto_capa: string
  tipo: string
}

const { width } = Dimensions.get('window')
const SLIDE_HEIGHT = 150
const AUTO_PLAY_MS = 3500

export default function BannerSlider() {
  const { ads, setAds } = useHome()
  const data: Ad[] = useMemo(() => Array.isArray(ads) ? ads : [], [ads])
  const [index, setIndex] = useState(0)
  const listRef = useRef<ICarouselInstance | null>(null)
  const [loading, setLoading] = useState(false)

  // Shuffle function for randomizing ads
  const shuffleArray = (array: Ad[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Diagnostics to identify invalid elements
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('BannerSlider component types:', {
      ContentLoader: typeof ContentLoader,
      Rect: typeof Rect,
      Carousel: typeof Carousel,
      LinearGradient: typeof LinearGradient,
      Image: typeof Image,
    })
  }, [])

  // Load real ads from API
  useEffect(() => {
    let mounted = true
    const loadRealAds = async () => {
      if (data.length || loading) return
      try {
        setLoading(true)
        const response = await axios.get<RealAd[]>('https://skyvendas-production.up.railway.app/produtos/allads')
        console.log('BannerSlider: Real ads API response =>', response.data)
        
        if (!mounted) return
        
        // Convert real ads to Ad format
        const convertedAds: Ad[] = response.data
          .filter(ad => ad.ativo && ad.produto_capa) // Only active ads with images
          .map(ad => ({
            id: ad.id,
            title: ad.titulo || ad.produto_nome,
            image: ad.produto_capa,
            link: undefined // No link provided in the API response
          }))
        
        // Randomize the ads
        const shuffledAds = shuffleArray(convertedAds)
        
        if (shuffledAds.length > 0) {
          setAds(shuffledAds)
        } else {
          console.log('BannerSlider: No valid ads found')
          setAds([])
        }
      } catch (e) {
        console.log('Error loading real ads:', e)
        setAds([])
      } finally {
        mounted && setLoading(false)
      }
    }
    loadRealAds()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length])

  // Auto play
  // Carousel handles autoplay; no manual interval needed.
  useEffect(() => {}, [data.length])

  // Debug: log whenever ads/data changes
  useEffect(() => {
    console.log('BannerSlider: ads updated. count=', data.length, 'sample=', data[0])
  }, [data])

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const next = viewableItems[0].index ?? 0
      if (typeof next === 'number') setIndex(next)
    }
  }).current

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 })

  const renderItem: ListRenderItem<Ad> = useCallback(({ item }) => {
    const onPress = () => {
      if (item.link) Linking.openURL(item.link).catch(() => {})
    }
    return (
      <View style={styles.card}>
        <Pressable onPress={onPress} style={{ flex: 1 }} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              contentFit='cover'
              cachePolicy='memory-disk'
            />
            {/* Bottom shadow gradient for title overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={styles.bottomGradient}
            />
            {/* Title overlay at bottom */}
            <View style={styles.titleOverlay}>
              <Text numberOfLines={2} style={styles.overlayTitle}>
                {item.title}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>
    )
  }, [])

  // Guard against undefined skeleton component
  if (loading || !data.length) {
    // On web, avoid react-content-loader due to potential SVG issues with React 19; render simple skeleton instead
    if (Platform.OS === 'web') {
      return (
        <View className='px-3 mt-3'>
          <View style={styles.card}>
            <View style={[styles.imageWrap, { backgroundColor: '#e5e7eb' }]} />
            <View style={{ width: (width - 24) * 0.5, height: 18, backgroundColor: '#e5e7eb', borderRadius: 6, marginTop: 8 }} />
          </View>
        </View>
      )
    }
    // Animated skeleton using react-content-loader/native
    if (!ContentLoader || typeof ContentLoader !== 'function') {
      // Fallback simple skeleton to avoid invalid element crash
      return (
        <View className='px-3 mt-3'>
          <View style={styles.card}>
            <View style={[styles.imageWrap, { backgroundColor: '#e5e7eb' }]} />
            <View style={{ width: (width - 24) * 0.5, height: 18, backgroundColor: '#e5e7eb', borderRadius: 6, marginTop: 8 }} />
          </View>
        </View>
      )
    }
    return (
      <View className='px-3 mt-3'>
        <View style={styles.card}>
          <ContentLoader
            speed={1.6}
            width={width - 24}
            height={SLIDE_HEIGHT + 8 + 18}
            viewBox={`0 0 ${width - 24} ${SLIDE_HEIGHT + 8 + 18}`}
            backgroundColor="#f0f0f0"
            foregroundColor="#dedede"
          >
            <Rect x="0" y="0" rx="12" ry="12" width={width - 24} height={SLIDE_HEIGHT} />
            <Rect x="0" y={SLIDE_HEIGHT + 8} rx="6" ry="6" width={(width - 24) * 0.5} height={18} />
          </ContentLoader>
        </View>
      </View>
    )
  }

  // Guard against undefined carousel component
  if (!Carousel) {
    // Fallback: render the first card statically to avoid crash
    const item = data[0]
    return (
      <View className='px-3 mt-3'>
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            {item?.image ? (
              <Image
                source={{ uri: item.image }}
                style={StyleSheet.absoluteFill}
                contentFit='cover'
                cachePolicy='memory-disk'
              />
            ) : null}
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.15)', 'transparent']}
              style={styles.topGradient}
            />
          </View>
          {item?.title ? (
            <Text numberOfLines={1} className='text-base text-neutral-200 mt-2 ml-1'>
              {item.title}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <View className='px-3 mt-3'>
      <Carousel
        ref={listRef}
        data={data}
        renderItem={renderItem as any}
        width={width - 24}
        height={SLIDE_HEIGHT}
        loop
        autoPlay
        autoPlayInterval={3500}
        pagingEnabled
        snapEnabled
        mode={'horizontal-stack'}
        modeConfig={{ snapDirection: 'left', stackInterval: 18 }}
        customConfig={() => ({ type: 'positive', viewCount: 5 })}
        onSnapToItem={(i: number) => setIndex(i)}
      />
    </View>
  )
}

const CARD_RADIUS = 12

const styles = StyleSheet.create({
  card: {
    width: width - 24,
    marginRight: 8,
  },
  imageWrap: {
    height: SLIDE_HEIGHT,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SLIDE_HEIGHT * 0.55,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SLIDE_HEIGHT * 0.4,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    justifyContent: 'flex-end',
  },
  overlayTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 16,
  },
})
