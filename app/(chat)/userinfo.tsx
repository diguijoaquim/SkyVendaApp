import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function UserInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const name = (params.name as string) || (params.nome as string) || '—';
  const username = (params.username as string) || '';
  const avatar = (params.avatar as string) || (params.foto as string) || '/avatar.png';
  const boldasCount = Number(params.boldas_count ?? 0);
  const postsCount = Number(params.posts_count ?? 0);

  const onAddFavorite = () => {};
  const onBlock = () => {};
  const onReport = () => {};
  const onDeleteMessages = () => {};

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="h-10 items-center justify-center">
            <Text className="font-semibold text-gray-900" numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="items-center gap-4 px-4 pt-6">
          <Image
            source={{ uri: avatar as string }}
            style={{ width: 160, height: 160, borderRadius: 80 }}
            contentFit="cover"
          />
          <Text className="text-2xl font-bold text-gray-900">{name}</Text>
          {!!username && (
            <Text className="text-gray-500">@{username}</Text>
          )}
        </View>

        <View className="flex-row justify-center gap-8 mt-8 px-8">
          <View className="items-center">
            <MaterialIcons name="grid-on" size={22} color="#4F46E5" />
            <Text className="mt-1 text-gray-700">Boldas</Text>
            <Text className="font-bold text-violet-600">{boldasCount}</Text>
          </View>
          <View className="items-center">
            <MaterialIcons name="article" size={22} color="#4F46E5" />
            <Text className="mt-1 text-gray-700">Publicações</Text>
            <Text className="font-bold text-violet-600">{postsCount}</Text>
          </View>
        </View>

        <View className="mt-8 border-t border-gray-200">
          <TouchableOpacity onPress={onAddFavorite} className="flex-row items-center gap-3 p-4 px-6">
            <Ionicons name="heart-outline" size={20} color="#374151" />
            <Text className="text-gray-800">Adicionar aos favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBlock} className="flex-row items-center gap-3 p-4 px-6">
            <Ionicons name="ban-outline" size={20} color="#EF4444" />
            <Text className="text-red-500">Bloquear {name}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onReport} className="flex-row items-center gap-3 p-4 px-6">
            <Ionicons name="thumbs-down-outline" size={20} color="#EF4444" />
            <Text className="text-red-500">Denunciar {name}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeleteMessages} className="flex-row items-center gap-3 p-4 px-6">
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text className="text-red-500">Apagar mensagens</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}