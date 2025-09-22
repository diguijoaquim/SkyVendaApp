import { useWebSocket } from '@/contexts/WebSocketContext';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text, useColorScheme, View, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native'
/**
 * This layout wraps all chat routes and provides a shared UI and navigation structure.
 * It includes a header with back button and chat title, and handles the chat context.
 */
export default function ChatLayout() {
  const colorScheme = useColorScheme();
  const { isConnected } = useWebSocket();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Chat',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="[chatId]"
          options={{
            title: 'Conversa',
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="new"
          options={{
            title: 'Nova Conversa',
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="list"
          options={{
            title: 'Lista de Conversas',
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>

      {/* Offline indicator */}
      {!isConnected && (
        <View
          className='relative top-0 left-0 right-0 bg-violet-600 p-3 items-center z-50'
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#" style={{ marginRight: 8 }} />
            <Text className='text-white '>
              Você está offline. Tentando reconectar...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
});