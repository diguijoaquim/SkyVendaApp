import React from 'react';
import { View } from 'react-native';
import DynamicFeed from '@/components/feed/DynamicFeed';

export default function MainIndex() {
  return (
    <View style={{ flex: 1 }}>
      <DynamicFeed />
    </View>
  );
}
