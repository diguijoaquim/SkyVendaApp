import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'

export default function NewPostInput() {
    return (
        <View className='flex flex-row h-[70px] border-b border-gray-300 px-4 justify-between items-center'>
            <TouchableOpacity>
                <Image source={require('../assets/images/icon.png')} style={{ width: 40, height: 40 }} />
            </TouchableOpacity>
            <TouchableOpacity className='border-x flex-1 bg-gray-100 p-3 rounded-full m-2 border-gray-300 mx-4'>
                <Text className='text-gray-600'>Poste uma novidade</Text>
            </TouchableOpacity>
            <TouchableOpacity className='flex flex-col justify-center items-center'>
                <Image source={require('../assets/images/icon.png')} style={{ width: 24, height: 24 }} />
                <Text>Foto</Text>
            </TouchableOpacity>
            

        </View>
    )
}