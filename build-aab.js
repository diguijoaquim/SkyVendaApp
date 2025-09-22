#!/usr/bin/env node

/**
 * Script para fazer build AAB do SkyVenda App
 * 
 * Uso:
 * npm run build:aab
 * ou
 * node build-aab.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando build AAB do SkyVenda App...\n');

// Verificar se eas-cli está instalado
try {
  execSync('eas --version', { stdio: 'ignore' });
} catch (error) {
  console.log('📦 Instalando EAS CLI...');
  execSync('npm install -g @expo/eas-cli', { stdio: 'inherit' });
}

// Verificar se está logado no Expo
try {
  execSync('eas whoami', { stdio: 'ignore' });
} catch (error) {
  console.log('🔐 Faça login no Expo:');
  execSync('eas login', { stdio: 'inherit' });
}

// Fazer o build
try {
  console.log('🔨 Iniciando build AAB para produção...');
  console.log('⏱️  Este processo pode levar alguns minutos...\n');
  
  execSync('eas build --platform android --profile production', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('\n✅ Build AAB concluído com sucesso!');
  console.log('📱 O arquivo AAB estará disponível no painel do Expo');
  console.log('🔗 Acesse: https://expo.dev/accounts/[sua-conta]/projects/skyvenda-app/builds');
  
} catch (error) {
  console.error('\n❌ Erro durante o build:', error.message);
  process.exit(1);
}

