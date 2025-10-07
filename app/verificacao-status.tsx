import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function VerificacaoStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const status = String(params.status || '').toLowerCase();
  const motivo = String(params.motivo || '');

  const aprovado = status === 'aprovado' || status === 'aprovada';
  const recusado = status === 'recusado' || status === 'reprovado';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text className="font-semibold text-gray-900">Estado da Verificação</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View className="p-6 gap-3">
        {aprovado && (
          <View className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <Text className="text-green-800 font-semibold text-lg">Parabéns! Sua conta foi verificada.</Text>
            <Text className="text-green-800 mt-1">Agora você tem acesso aos benefícios da verificação na SkyVenda e SkyWallet.</Text>
          </View>
        )}
        {recusado && (
          <View className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <Text className="text-red-800 font-semibold text-lg">Sua verificação foi reprovada.</Text>
            <Text className="text-red-800 mt-1">Verifique os documentos enviados e tente novamente, garantindo boa qualidade e dados corretos.</Text>
            {!!motivo && (
              <View className="mt-2 bg-white/60 border border-red-200 rounded p-3">
                <Text className="text-red-700 font-semibold">Motivo informado:</Text>
                <Text className="text-red-700 mt-1">{motivo}</Text>
              </View>
            )}
          </View>
        )}

        {!aprovado && !recusado && (
          <View className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <Text className="text-blue-800 font-semibold text-lg">Estado indisponível</Text>
            <Text className="text-blue-800 mt-1">Não foi possível determinar o estado da verificação a partir da notificação.</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/(main)/notifications')} className="mt-4 bg-violet-600 px-4 py-3 rounded-md items-center">
          <Text className="text-white font-semibold">Voltar para Notificações</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


