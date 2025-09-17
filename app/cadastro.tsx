import { useAuth } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GoogleIcon from '../components/GoogleIcon';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name || !email || !username || !password) return;
    
    setLoading(true);
    try {
      await signup(name, email, username, password);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <LinearGradient
        colors={["#f7eeff", "#F5F3FF", "#fdebecf5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-center px-5 py-8">
          {/* Header */}
          <View className="items-center mb-10">
            <View className="mb-10">
              <Image
                source={require('../assets/images/icon.png')}
                className="h-16 w-16"
                style={{ width: 64, height: 64 }}
              />
            </View>
            <Text className="text-3xl font-extrabold text-violet-600">SkyVenda MZ</Text>
            <Text className="mt-2 text-gray-600">Crie sua conta</Text>
          </View>

          {/* Form */}
          <View className='px-2'>
            {/* Name Input */}
            <View className="relative" style={{ marginBottom: 14 }}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#9CA3AF"
                style={{ position: 'absolute', left: 12, top: 16, zIndex: 1 }}
              />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nome completo"
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Email Input */}
            <View className="relative" style={{ marginBottom: 14 }}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#9CA3AF"
                style={{ position: 'absolute', left: 12, top: 16, zIndex: 1 }}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

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
                placeholder="Nome de usuário"
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
                placeholder="Senha"
                secureTextEntry
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Signup Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full bg-violet-500"
              style={{ marginTop: 16, marginBottom: 32 }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium text-base">Criar conta</Text>
              )}
            </TouchableOpacity>

            {/* Google Signup and Login */}
            <View style={{ marginTop: 40 }}>
              {/* Google Button */}
              <TouchableOpacity className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-gray-300 bg-white" style={{ marginBottom: 16 }}>
                <View className="flex-row items-center gap-3">
                  <GoogleIcon width={18} height={18} />
                  <Text className="text-gray-700 font-medium text-sm">Continuar com Google</Text>
                </View>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={() => router.push('/login')}
                className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-violet-500"
              >
                <Text className="text-violet-500 font-medium text-base">Já tenho conta</Text>
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
