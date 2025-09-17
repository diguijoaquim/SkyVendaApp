import React from 'react';
import { View, StyleSheet } from 'react-native';
import ContentLoader, { Rect } from './ContentLoader';

export default function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <ContentLoader
        speed={1}
        width="100%"
        height={200}
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        <Rect x="0" y="0" rx="12" ry="12" width="100%" height="120" />
        <Rect x="10" y="130" rx="4" ry="4" width="80%" height="16" />
        <Rect x="10" y="150" rx="4" ry="4" width="40%" height="14" />
        <Rect x="10" y="170" rx="4" ry="4" width="60%" height="12" />
      </ContentLoader>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
});
