import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileIndex() {
  const router = useRouter();
  const [username, setUsername] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <Text className="font-semibold text-gray-900">Perfil</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View className="flex-1 p-6">
        <Text className="text-lg font-semibold text-gray-900">Abrir perfil por username</Text>
        <Text className="mt-1 text-gray-600">Digite o username e avance para ver o perfil.</Text>

        <View className="mt-5 gap-3">
          <TextInput
            placeholder="ex.: joao_sky"
            value={username}
            onChangeText={setUsername}
            className="border border-gray-300 rounded-md px-4 py-3"
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => username && router.push({ pathname: '/(profile)/[username]', params: { username } })}
            className={`px-4 py-3 rounded-md ${username ? 'bg-violet-600' : 'bg-gray-300'}`}
            disabled={!username}
          >
            <Text className="text-white font-semibold text-center">Abrir</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-8 border-t border-gray-200 pt-5">
          <Text className="text-gray-500">Você também pode navegar diretamente para:</Text>
          <Text className="mt-1 text-gray-800">/(profile)/[username]</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
