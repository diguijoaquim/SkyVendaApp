import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginingScreen() {
  const [message, setMessage] = useState("Autenticando, por favor aguarde...");
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Simular processo de autenticação
    const timer = setTimeout(() => {
      setMessage("Login realizado com sucesso!");
      
      // Aguardar um pouco para mostrar a mensagem de sucesso
      setTimeout(() => {
        // Navegar para a tela principal mantendo histórico
        router.push('/(main)');
      }, 1500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  // Se já estiver autenticado, redirecionar imediatamente
  useEffect(() => {
    if (isAuthenticated) {
      setMessage("Redirecionando...");
      setTimeout(() => {
        router.push('/(main)');
      }, 500);
    }
  }, [isAuthenticated, router]);

  return (
    <View style={styles.container}>
      {/* Spinner de carregamento */}
      <ActivityIndicator 
        size="large" 
        color="#4F46E5" 
        style={styles.spinner}
      />
      
      {/* Mensagem dinâmica */}
      <Text style={styles.message}>
        {message}
      </Text>
      
      {/* Texto adicional */}
      <Text style={styles.subText}>
        Aguarde enquanto processamos seu login...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
  },
});
