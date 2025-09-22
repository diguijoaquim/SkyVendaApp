import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import DynamicFeed from '@/components/feed/DynamicFeed';
import { Ionicons } from '@expo/vector-icons';

export default function MainIndex() {
  const [isOnline, setIsOnline] = useState(false)

  return (
    <View style={{ flex: 1 }}>
      {isOnline ? <DynamicFeed /> : <View className='flex-1 items-center justify-center'>
        <Ionicons name='wifi' size={40} className='text-violet-600'></Ionicons>
        <Text className='text-gray-600 font-bold'>Sem internet</Text>
        <Text className='text-gray-400'>Verifique a sua ligacao e tente novamente</Text>
        <TouchableOpacity className='py-5' onPress={()=>{
          setIsOnline(true)
          setTimeout(() => {
            setIsOnline(false)
          }, 1000);
        }}>
          <View className='bg-violet-500 text-white py-1  px-10 rounded-md'>Atualizar</View>
        </TouchableOpacity>
      </View>}
    </View>
  );
}
