import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts';
import { LinearGradient } from 'expo-linear-gradient';
import GoogleIcon from '../components/GoogleIcon';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const { getToken, isAuthenticated, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!username || !password) return;
    
    setLoginLoading(true);
    try {
      await getToken(username, password);
      setLoginLoading(false);
    } catch (error) {
      console.log("erro ao entrar", error);
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
    </ScrollView>
  );
}
