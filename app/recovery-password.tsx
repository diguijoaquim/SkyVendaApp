import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
            <Text className="mt-2 text-gray-600">Recuperar conta</Text>
          </View>

          {/* Form */}
          <View className='px-2'>
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
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full bg-violet-500"
              style={{ marginBottom: 14 }}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-medium text-base">Enviar instruções</Text>
              )}
            </TouchableOpacity>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-full flex-row items-center justify-center py-4 px-4 rounded-full border border-violet-500"
            >
              <Text className="text-violet-500 font-medium text-base">Voltar ao Login</Text>
            </TouchableOpacity>
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