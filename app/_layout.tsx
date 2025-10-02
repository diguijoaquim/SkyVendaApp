import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import SplashScreen from '@/components/SplashScreen';
import { AuthProvider, ChatProvider, HomeProvider, LoadingProvider, useAuth } from '@/contexts';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

// Componente interno que usa o AuthContext
function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { loading } = useAuth();

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} isLoading={loading} />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ 
        flex: 1, 
        backgroundColor: '#ffffff'
      }}>
        <LoadingProvider>
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
                    name="(main)"
                    options={{
                      headerShown: false,
                      title: 'Principal',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="(chat)"
                    options={{
                      headerShown: false,
                      title: 'Chat',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="(produtos)"
                    options={{
                      headerShown: false,
                      title: 'Produtos',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="(profile)"
                    options={{
                      headerShown: false,
                      title: 'Perfil',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="(wallet)"
                    options={{
                      headerShown: false,
                      title: 'Carteira',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="(skywallet)"
                    options={{
                      headerShown: false,
                      title: 'SkyWallet',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="product/[slug]"
                    options={{
                      headerShown: false,
                      title: 'Produto',
                      animation: 'slide_from_bottom',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="pedido/[orderId]"
                    options={{
                      headerShown: false,
                      title: 'Pedido',
                      animation: 'slide_from_right',
                      gestureEnabled: true,
                    }}
                  />
                  <Stack.Screen
                    name="+not-found"
                    options={{
                      headerShown: false,
                      title: 'Não Encontrado',
                      animation: 'none',
                      gestureEnabled: true,
                    }}
                  />
                </Stack>
              </ThemeProvider>
            </WebSocketProvider>
          </ChatProvider>
        </HomeProvider>
        </LoadingProvider>
      </View>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  // Force light theme
  const colorScheme = 'light';
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
