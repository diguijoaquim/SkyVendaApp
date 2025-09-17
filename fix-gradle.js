const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Diagnóstico e Correção do Gradle Build');
console.log('==========================================\n');

// Verificar se estamos na pasta correta
if (!fs.existsSync('android')) {
  console.log('❌ Pasta android não encontrada!');
  console.log('Execute primeiro: expo prebuild');
  process.exit(1);
}

console.log('✅ Pasta android encontrada');

// Verificar Java
try {
  const javaVersion = execSync('java --version', { encoding: 'utf8' });
  console.log('✅ Java encontrado:');
  console.log(javaVersion.split('\n')[0]);
} catch (error) {
  console.log('❌ Java não encontrado ou não está no PATH');
  console.log('Instale Java 11 ou 17 e configure JAVA_HOME');
}

// Verificar Android SDK
try {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (androidHome) {
    console.log(`✅ ANDROID_HOME: ${androidHome}`);
    
    // Verificar se existe
    if (fs.existsSync(androidHome)) {
      console.log('✅ Android SDK encontrado');
    } else {
      console.log('❌ Android SDK não encontrado no caminho especificado');
    }
  } else {
    console.log('❌ ANDROID_HOME não configurado');
    console.log('Configure a variável de ambiente ANDROID_HOME');
  }
} catch (error) {
  console.log('❌ Erro ao verificar Android SDK');
}

// Verificar Gradle
try {
  const gradleVersion = execSync('cd android && ./gradlew --version', { encoding: 'utf8' });
  console.log('✅ Gradle encontrado:');
  console.log(gradleVersion.split('\n')[0]);
} catch (error) {
  console.log('❌ Gradle não encontrado ou erro ao executar');
}

console.log('\n🛠️ Soluções Recomendadas:');
console.log('1. Limpar cache do Gradle:');
console.log('   cd android && ./gradlew clean');
console.log('   cd android && ./gradlew --stop');
console.log('');
console.log('2. Verificar permissões (Linux/Mac):');
console.log('   chmod +x android/gradlew');
console.log('');
console.log('3. Reinstalar dependências:');
console.log('   rm -rf node_modules');
console.log('   npm install');
console.log('');
console.log('4. Usar EAS Build (alternativa):');
console.log('   npm install -g @expo/eas-cli');
console.log('   eas login');
console.log('   npm run build:dev');
console.log('');
console.log('5. Verificar versão do Java:');
console.log('   - Use Java 11 ou 17');
console.log('   - Configure JAVA_HOME');
console.log('');
console.log('6. Verificar Android SDK:');
console.log('   - Instale Android Studio');
console.log('   - Configure ANDROID_HOME');
console.log('   - Instale SDK 33 ou 34');

console.log('\n🎯 Para testar o deep linking após resolver:');
console.log('1. Reinstale o app');
console.log('2. Teste com: https://skyvenda.com/auth/success?token=test123&id=15');
console.log('3. Verifique os logs no console');
