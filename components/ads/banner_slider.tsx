import ContentLoader, { Rect } from '@/components/skeletons/ContentLoader'
import { Ionicons } from '@expo/vector-icons'
import axios from 'axios'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Dimensions, Linking, ListRenderItem, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'

type Ad = { 
  id: number; 
  title: string; 
  image: string; 
  link?: string;
  tipo_anuncio?: string;
  location?: string;
  price?: number;
  produto_id?: number;
  slug?: string;
}

type RealAd = {
  id: number
  titulo?: string
  nome?: string
  descricao: string
  tipo_anuncio?: string
  produto_id?: number
  promovido_em?: string
  expira_em: string
  ativo: boolean
  preco?: number
  produto_nome?: string
  produto_capa?: string
  foto?: string
  tipo: string
  localizacao?: string | null
  link?: string
  status?: string
  criado_em?: string
  cliques?: number
  usuario_id?: number
  slug?: string
}

const { width } = Dimensions.get('window')
const SLIDE_HEIGHT = 160
const AUTO_PLAY_MS = 3500

export default function BannerSlider() {
  const router = useRouter()
  const [data, setData] = useState<Ad[]>([])
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


  // Get badge info based on ad type
  const getBadgeInfo = (tipoAnuncio?: string) => {
    switch (tipoAnuncio) {
      case 'melhores_boladas':
        return { text: 'MELHOR BOLADA', color: '#FFFFFF', bgColor: '#DC2626' }
      case 'ofertas_diarias':
        return { text: 'OFERTA DIÁRIA', color: '#FFFFFF', bgColor: '#EA580C' }
      case 'promocoes':
        return { text: 'PROMOÇÃO', color: '#FFFFFF', bgColor: '#7C3AED' }
      case 'destaque':
        return { text: 'DESTAQUE', color: '#FFFFFF', bgColor: '#059669' }
      default:
        return { text: 'OFERTA', color: '#FFFFFF', bgColor: '#374151' }
    }
  }

  const formatMZN = (value?: number) => {
    if (typeof value !== 'number') return ''
    try {
      return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value)
    } catch {
      return `MZN ${value}`
    }
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
        console.log('🌐 BannerSlider: Real ads API response =>', {
          status: response.status,
          dataLength: response.data?.length,
          firstItem: response.data?.[0],
          allData: response.data
        })
        
        // Log each ad to see the structure
        response.data?.forEach((ad, index) => {
          console.log(`🔍 Ad ${index}:`, {
            id: ad.id,
            tipo: ad.tipo,
            titulo: ad.titulo,
            nome: ad.nome,
            slug: ad.slug,
            link: ad.link,
            produto_id: ad.produto_id
          });
        });
        
        if (!mounted) return
        
        // Convert real ads to Ad format
        console.log('🔍 Filtering ads...');
        const filteredAds = response.data.filter(ad => {
          // For anuncio2, check if it has foto, for anuncio1 check produto_capa
          const hasImage = ad.tipo === 'anuncio2' ? ad.foto : ad.produto_capa;
          const isValid = ad.ativo && hasImage;
          console.log('🔍 Ad filter check:', {
            id: ad.id,
            tipo: ad.tipo,
            ativo: ad.ativo,
            hasImage,
            isValid
          });
          return isValid;
        });
        
        console.log('🔍 Filtered ads count:', filteredAds.length);
        
        const convertedAds: Ad[] = filteredAds.map(ad => {
          // Use nome when titulo is empty or doesn't exist
          const title = ad.titulo && ad.titulo.trim() ? ad.titulo : (ad.nome || ad.produto_nome || 'Sem título');
          const image = ad.tipo === 'anuncio2' ? ad.foto : ad.produto_capa;
          
          console.log('🔍 Processing ad:', {
            id: ad.id,
            tipo: ad.tipo,
            title,
            image,
            ativo: ad.ativo,
            produto_id: ad.produto_id,
            link: ad.link,
            slug: ad.slug,
            fullAd: ad
          });
          
          return {
            id: ad.id,
            title,
            image: image!,
            link: ad.link, // For anuncio2, this will be the external link
            tipo_anuncio: ad.tipo_anuncio,
            location: ad.localizacao && ad.localizacao !== 'null' ? ad.localizacao : 'Moçambique',
            price: ad.preco,
            produto_id: ad.produto_id,
            slug: ad.slug, // For anuncio1, this will be the product slug
          };
        })
        
        // Randomize the ads
        const shuffledAds = shuffleArray(convertedAds)
        
        if (shuffledAds.length > 0) {
          setData(shuffledAds)
        } else {
          console.log('BannerSlider: No valid ads found')
          setData([])
        }
      } catch (e) {
        console.log('Error loading real ads:', e)
        setData([])
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
    console.log('📊 BannerSlider: ads updated. count=', data.length, 'sample=', data[0])
    if (data.length > 0) {
      console.log('📋 All ads data:', data.map(ad => ({
        id: ad.id,
        title: ad.title,
        image: ad.image,
        hasImage: !!ad.image,
        imageUrl: ad.image
      })));
      
      // Log individual URLs for debugging
      data.forEach((ad, index) => {
        console.log(`🔍 Ad ${index}:`, {
          id: ad.id,
          title: ad.title,
          imageUrl: ad.image,
          isValidUrl: ad.image && ad.image.startsWith('http')
        });
      });
    }
  }, [data])

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length) {
      const next = viewableItems[0].index ?? 0
      if (typeof next === 'number') setIndex(next)
    }
  }).current

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 })

  const renderItem: ListRenderItem<Ad> = useCallback(({ item }) => {
    const onPress = async () => {
      console.log('🎯 Ad clicked:', {
        id: item.id,
        title: item.title,
        produto_id: item.produto_id,
        link: item.link,
        slug: item.slug
      })
      
      // Check if it's an external link (anuncio2) or product navigation (anuncio1)
      if (item.link) {
        console.log('🔗 Opening external link (anuncio2):', item.link)
        try {
          await Linking.openURL(item.link)
        } catch (error) {
          console.log('❌ Error opening external link:', error)
          Alert.alert('Erro', 'Não foi possível abrir o link')
        }
      } else if (item.slug) {
        console.log('🛍️ Navigating to product (anuncio1) with slug:', item.slug)
        try {
          console.log('🚀 Navigating to:', `/product/${item.slug}`)
          router.push(`/product/${item.slug}`)
        } catch (error) {
          console.log('❌ Error navigating to product:', error)
          Alert.alert('Erro', 'Erro ao navegar para o produto')
        }
      } else {
        console.log('⚠️ No link or slug found for ad:', item)
        Alert.alert('Aviso', 'Este anúncio não tem link ou produto associado')
      }
    }
    return (
      <View style={styles.card}>
        <Pressable 
          onPress={onPress} 
          style={{ flex: 1 }} 
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: item.image }}
              style={StyleSheet.absoluteFill}
              contentFit='cover'
              cachePolicy='memory'
              onError={(error) => {
                console.log('❌ Image load error:', {
                  error,
                  url: item.image,
                  title: item.title,
                  id: item.id
                });
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully:', {
                  url: item.image,
                  title: item.title,
                  id: item.id
                });
              }}
              onLoadStart={() => {
                console.log('🔄 Image load started:', {
                  url: item.image,
                  title: item.title,
                  id: item.id
                });
              }}
            />
            {/* Top badge for ad type */}
            {item.tipo_anuncio && (
              <View style={[styles.badgeContainer, { backgroundColor: getBadgeInfo(item.tipo_anuncio).bgColor }]}>
                <Text style={[styles.badgeText, { color: getBadgeInfo(item.tipo_anuncio).color }]}>
                  {getBadgeInfo(item.tipo_anuncio).text}
                </Text>
              </View>
            )}

            {/* Bottom shadow gradient for title overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={styles.bottomGradient}
            />
            {/* Title overlay at bottom */}
            <View style={styles.titleOverlay}>
              <Text numberOfLines={1} style={styles.overlayTitle}>
                {item.title || 'Sem título'}
              </Text>
              {(item.location || item.price) && (
                <View style={styles.metaRow}>
                  {item.location ? (
                    <View style={styles.locationContainer}>
                      <Ionicons name="location" size={14} color="#FFD700" />
                      <Text numberOfLines={1} style={styles.locationText}>
                        {item.location}
                      </Text>
                    </View>
                  ) : <View />}
                  {!!item.price && (
                    <View style={styles.priceInlineBadge}>
                      <Text style={styles.priceInlineText}>{formatMZN(item.price)}</Text>
                    </View>
                  )}
                </View>
              )}
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
        <View style={styles.container}>
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
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={[styles.imageWrap, { backgroundColor: '#e5e7eb' }]} />
            <View style={{ width: (width - 24) * 0.5, height: 18, backgroundColor: '#e5e7eb', borderRadius: 6, marginTop: 8 }} />
          </View>
        </View>
      )
    }
    return (
      <View style={styles.container}>
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
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            {item?.image ? (
              <Image
                source={{ uri: item.image }}
                style={StyleSheet.absoluteFill}
                contentFit='cover'
                cachePolicy='memory'
                onError={(error) => {
                  console.log('❌ Image load error in fallback:', {
                    error,
                    url: item.image,
                    title: item.title,
                    id: item.id
                  });
                }}
                onLoad={() => {
                  console.log('✅ Image loaded successfully in fallback:', {
                    url: item.image,
                    title: item.title,
                    id: item.id
                  });
                }}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>Sem imagem</Text>
              </View>
            )}
            {/* Top badge for ad type */}
            {item?.tipo_anuncio && (
              <View style={[styles.badgeContainer, { backgroundColor: getBadgeInfo(item.tipo_anuncio).bgColor }]}>
                <Text style={[styles.badgeText, { color: getBadgeInfo(item.tipo_anuncio).color }]}>
                  {getBadgeInfo(item.tipo_anuncio).text}
                </Text>
              </View>
            )}
            
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.15)', 'transparent']}
              style={styles.topGradient}
            />
          </View>
          {item?.title ? (
            <View style={styles.fallbackTitleContainer}>
              <Text numberOfLines={1} style={styles.fallbackTitle}>
                {item.title || 'Sem título'}
              </Text>
              {item?.location && (
                <View style={styles.fallbackLocationContainer}>
                  <Ionicons name="location" size={10} color="#9CA3AF" />
                  <Text numberOfLines={1} style={styles.fallbackLocationText}>
                    {item.location}
                  </Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Carousel
        ref={listRef}
        data={data}
        renderItem={renderItem as any}
        width={width - 24}
        height={SLIDE_HEIGHT}
        loop={data.length > 1}
        autoPlay={data.length > 1}
        autoPlayInterval={4000}
        pagingEnabled
        snapEnabled
        mode={'horizontal-stack'}
        modeConfig={{ snapDirection: 'left', stackInterval: 18 }}
        customConfig={() => ({ type: 'positive', viewCount: 5 })}
        onSnapToItem={(i: number) => setIndex(i)}
        style={{ width: width - 24 }}
      />
    </View>
  )
}

const CARD_RADIUS = 12

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginTop: 12,
  },
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
    paddingHorizontal: 12,
    paddingBottom: 6,
    paddingTop: 8,
    justifyContent: 'flex-end',
  },
  overlayTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
  fallbackTitleContainer: {
    marginTop: 8,
    marginLeft: 4,
  },
  fallbackTitle: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  fallbackLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  fallbackLocationText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  priceBadge: {
    position: 'absolute',
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
    backgroundColor: 'rgba(17,24,39,0.75)', // slate-900 with opacity for contrast
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  priceInlineBadge: {
    alignSelf: 'flex-end',
    marginTop: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.9)', // violet-600 with opacity
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  priceInlineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})
