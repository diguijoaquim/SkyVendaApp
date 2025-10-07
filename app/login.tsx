import { useAuth } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Pressable } from 'react-native';
import GoogleIcon from '../components/GoogleIcon';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { getToken, isAuthenticated, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!username || !password) return;
    
    setLoginLoading(true);
    try {
      await getToken(username, password);
      setLoginLoading(false);
    } catch (error) {
      // Mostrar dialogo de erro com mensagens específicas
      const message = (() => {
        const anyErr: any = error;
        const status = anyErr?.response?.status;
        if (status === 401) {
          return 'Credenciais inválidas. Verifique seu email ou senha.';
        }
        if (status === 422) {
          return 'Dados inválidos. Verifique seu email e senha.';
        }
        if (anyErr?.message === 'Network Error') {
          return 'Sem conexão. Verifique sua internet e tente novamente.';
        }
        return 'Falha ao entrar. Tente novamente mais tarde.';
      })();
      setErrorMessage(message);
      setErrorVisible(true);
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <LinearGradient
        colors={["#f7eeff", "#F5F3FF", "#fdebecf5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center px-5 py-8">
          {/* Logo and Header */}
          <View className="items-center mb-10">
            <View className="mb-10">
              <Image
                source={require('../assets/images/icon.png')}
                className="h-16 w-16"
                style={{ width: 64, height: 64 }}
              />
            </View>
            <Text className="text-3xl font-extrabold text-violet-600">SkyVenda MZ</Text>
            <Text className="mt-2 text-gray-600">Bem-vindo de volta!</Text>
          </View>

          {/* Form */}
          <View className='px-2'>
            {/* Username Input */}
            <View className="relative" style={{ marginBottom: 14 }}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#9CA3AF"
                style={{ position: 'absolute', left: 12, top: 16, zIndex: 1 }}
              />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
 
            {/* Password Input */}
            <View className="relative" style={{ marginBottom: 14 }}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#9CA3AF"
                style={{ position: 'absolute', left: 12, top: 16, zIndex: 1 }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loginLoading}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full bg-violet-500"
              style={{ marginBottom: 14 }}
            >
              {loginLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium text-base">Entrar</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password */}
            <View className="items-center" style={{ marginBottom: 32 }}>
              <TouchableOpacity onPress={() => router.push('/recovery-password')}>
                <Text className="text-blue-600 text-sm">Esqueceu a senha?</Text>
              </TouchableOpacity>
            </View>

            {/* Google Login and Signup */}
            <View style={{ marginTop: 40 }}>
                          {/* Google Button */}
            <TouchableOpacity 
              onPress={loginWithGoogle}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-gray-300 bg-white" 
              style={{ marginBottom: 16 }}
            >
              <View className="flex-row items-center gap-3">
                <GoogleIcon width={18} height={18} />
                <Text className="text-gray-700 font-medium text-sm">Continuar com Google</Text>
              </View>
            </TouchableOpacity>

              {/* Signup Button */}
              <TouchableOpacity
                onPress={() => router.push('/cadastro')}
                className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-violet-500"
              >
                <Text className="text-violet-500 font-medium text-base">Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View className="items-center mt-12">
            <Text className="text-gray-400 text-sm font-bold">BlueSpark MZ</Text>
          </View>
        </View>
      </LinearGradient>
      {/* Dialogo de Erro */}
      <Modal
        visible={errorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorVisible(false)}
      >
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <View className="w-11/12 rounded-2xl bg-white p-5">
            <Text className="text-lg font-semibold text-gray-900 mb-1">Não foi possível entrar</Text>
            <Text className="text-gray-600 mb-5">{errorMessage || 'Ocorreu um erro ao autenticar.'}</Text>
            <View className="gap-3">
              <TouchableOpacity
                onPress={() => {
                  setErrorVisible(false);
                  router.push('/recovery-password');
                }}
                className="w-full items-center justify-center py-3 rounded-full bg-violet-600"
              >
                <Text className="text-white font-semibold">Recuperar conta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setErrorVisible(false)}
                className="w-full items-center justify-center py-3 rounded-full bg-white border border-violet-600"
              >
                <Text className="text-violet-600 font-semibold">Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
