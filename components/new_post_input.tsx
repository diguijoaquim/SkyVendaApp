import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import NewPostDialog from './NewPostDialog'

export default function NewPostInput() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);

  const avatar = useMemo(() => {
    return user?.perfil || user?.avatar || null;
  }, [user]);

  const goToProfile = () => {
    if (isAuthenticated && user?.username) {
      router.push({ pathname: '/(profile)/[username]', params: { username: user.username } });
    } else {
      router.push('/login');
    }
  };

  const handleNewPostPress = () => {
    if (isAuthenticated) {
      setShowNewPostDialog(true);
    } else {
      router.push('/login');
    }
  };

  const handlePostCreated = () => {
    // Optionally refresh data or show success message
    console.log('Post created successfully');
  };

  return (
    <>
      <View className='flex flex-row h-[70px] border-b border-gray-300 px-4 justify-between items-center'>
        <TouchableOpacity onPress={goToProfile} activeOpacity={0.8}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <Image source={require('../assets/images/icon.png')} style={{ width: 40, height: 40, borderRadius: 20 }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          className='border-x flex-1 bg-gray-100 p-3 rounded-full m-2 border-gray-300 mx-4' 
          onPress={handleNewPostPress} 
          activeOpacity={0.8}
        >
          <Text className='text-gray-600'>Poste uma novidade</Text>
        </TouchableOpacity>
        <TouchableOpacity className='flex flex-col justify-center items-center'>
          <Image source={require('../assets/images/icon.png')} style={{ width: 24, height: 24 }} />
          <Text>Foto</Text>
        </TouchableOpacity>
      </View>

      <NewPostDialog
        visible={showNewPostDialog}
        onClose={() => setShowNewPostDialog(false)}
        onPostCreated={handlePostCreated}
      />
    </>
  )
}