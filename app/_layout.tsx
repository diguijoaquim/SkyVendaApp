import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import SplashScreen from '@/components/SplashScreen';
import { AuthProvider, ChatProvider, HomeProvider, LoadingProvider } from '@/contexts';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

export default function RootLayout() {
  // Force light theme
  const colorScheme = 'light';
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Simular carregamento de dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Verificar se há token salvo
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          // Simular carregamento de dados do usuário
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Simular carregamento inicial
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} isLoading={isLoading} />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ 
        flex: 1, 
        backgroundColor: '#ffffff'
      }}>
        <LoadingProvider>
        <AuthProvider>
          <HomeProvider>
            <ChatProvider>
              <WebSocketProvider>
                <ThemeProvider value={DefaultTheme}>
                  <StatusBar 
                    style="dark" 
                    backgroundColor="#ffffff"
                    translucent={Platform.OS === 'android'}
                  />
                  <Stack 
                    screenOptions={{ 
                      headerShown: false, 
                      animation: 'none',
                      gestureEnabled: true,
                      contentStyle: Platform.OS === 'android' ? {
                        backgroundColor: '#ffffff'
                      } : {}
                    }} 
                    initialRouteName="(main)"
                  >
                    <Stack.Screen name="index" options={{ headerShown: false }}  />
                    <Stack.Screen name="login" options={{ headerShown: false, title: 'Login' }} />
                    <Stack.Screen name="logining" options={{ headerShown: false, title: 'Autenticando' }} />
                    <Stack.Screen name="cadastro" options={{ headerShown: false, title: 'Cadastro' }} />
                    <Stack.Screen name="recovery-password" options={{ headerShown: false, title: 'Recuperar Senha' }} />
                    <Stack.Screen 
                      name="mobilemenu" 
                      options={{ 
                        headerShown: false, 
                        title: 'Menu Mobile', 
                        animation: 'none',
                        gestureEnabled: true,
                      }} 
                    />
                    <Stack.Screen 
                      name="search" 
                      options={{ 
                        headerShown: false, 
                        title: 'Pesquisar',
                        animation: 'slide_from_right',
                        gestureEnabled: true,
                      }} 
                    />
                    <Stack.Screen 
                      name="publish-product" 
                      options={{ 
                        headerShown: false, 
                        title: 'Publicar Produto',
                        animation: 'slide_from_right',
                        gestureEnabled: true,
                      }} 
                    />
                    <Stack.Screen name="(main)" options={{ headerShown: false }} />
                    <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                  </Stack>
                </ThemeProvider>
              </WebSocketProvider>
            </ChatProvider>
          </HomeProvider>
        </AuthProvider>
        </LoadingProvider>
      </View>
    </SafeAreaProvider>
  );
}
