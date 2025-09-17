import React from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import Header from '../components/header';
import Home from './home';


export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Fixed header */}
      <Header />
      {/* Scrollable content below header */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Home />
      </ScrollView>
    </SafeAreaView>
  );
}

