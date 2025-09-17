import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RecoveryPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email) return;
    
    setLoading(true);
    try {
      // TODO: Implement password recovery API call
      console.log('Recovery email sent to:', email);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('Error sending recovery email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100">
      <View className="flex-1 justify-center px-4 py-6 min-h-screen">
        <View className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-6 space-y-6">
          {/* Header */}
          <View className="items-center">
            <View className="mb-14">
              <Ionicons name="key-outline" size={64} color="#6366F1" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 text-center">
              Recuperar Senha
            </Text>
            <Text className="mt-2 text-gray-600 text-center">
              Digite seu email para receber instruções de recuperação
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            {/* Email Input */}
            <View className="relative">
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#9CA3AF" 
                style={{ position: 'absolute', left: 12, top: 16, zIndex: 1 }}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Digite seu email"
                keyboardType="email-address"
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-lg text-base bg-white"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full bg-indigo-500"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium text-base">Enviar Email</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-indigo-500"
            >
              <Text className="text-indigo-500 font-medium text-base">Voltar ao Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Text className="text-gray-400 text-sm font-bold">BlueSpark MZ</Text>
        </View>
      </View>
    </ScrollView>
  );
} 