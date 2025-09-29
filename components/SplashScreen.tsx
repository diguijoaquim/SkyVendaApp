import React, { useEffect, useState } from 'react';
import { Animated, Image, Text, View } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
  isLoading: boolean;
}

const LoadingDots = () => {
  const [dotAnimations] = useState(
    Array.from({ length: 5 }, () => new Animated.Value(0.3))
  );

  useEffect(() => {
    const animateDots = () => {
      const animations = dotAnimations.map((anim, index) =>
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            delay: index * 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.loop(
        Animated.parallel(animations)
      ).start();
    };

    animateDots();
  }, [dotAnimations]);

  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {dotAnimations.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            backgroundColor: '#4F46E5',
            borderRadius: 4,
            opacity: anim,
          }}
        />
      ))}
    </View>
  );
};

export default function SplashScreen({ onFinish, isLoading }: SplashScreenProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [logoAnim] = useState(new Animated.Value(0));
  const [textAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animação de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 800,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, logoAnim, textAnim]);

  // Só fecha o splash quando o loading terminar
  useEffect(() => {
    if (!isLoading) {
      // Aguarda um pouco para mostrar a animação de saída
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, fadeAnim, onFinish]);

  return (
    <Animated.View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: fadeAnim,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      {/* Logo e Loading dots no centro */}
      <View style={{ alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <Animated.View
          style={{
            opacity: logoAnim,
            transform: [
              {
                scale: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          }}
        >
          <Image
            source={require('../assets/images/icon.png')}
            style={{
              width: 64,
              height: 64,
            }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Loading dots */}
        <Animated.View
          style={{
            opacity: textAnim,
          }}
        >
          <LoadingDots />
        </Animated.View>
      </View>

      {/* "from BlueSpark MZ" text - fixo na parte inferior */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: textAnim,
          transform: [
            {
              translateY: textAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        }}
      >
        <Text
          style={{
            color: '#D1D5DB',
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
          }}
        >
          from
        </Text>
        <Text
          style={{
            color: '#6B7280',
            fontSize: 16,
            fontWeight: '600',
          }}
        >
          BlueSpark MZ
        </Text>
      </Animated.View>
    </Animated.View>
  );
}