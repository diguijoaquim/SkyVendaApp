// Teste de Deep Linking para SkyVenda App
// Este arquivo pode ser usado para testar o deep linking

// URLs de teste para o deep linking
const testUrls = [
  // URL principal do Google Auth
  'https://skyvenda.com/auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsInJvbGUiOiJjbGllbnRlIiwiZXhwIjoxNzU3NDYwOTQ3fQ.i8eoR-bGjBl0zutNkKAPaWPgFzg_Mk5pFeg2MpsjvLI&id=15',
  
  // URL alternativa com scheme personalizado (legacy)
  'skyvendaapp://auth/success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsInJvbGUiOiJjbGllbnRlIiwiZXhwIjoxNzU3NDYwOTQ3fQ.i8eoR-bGjBl0zutNkKAPaWPgFzg_Mk5pFeg2MpsjvLI&id=15',
  
  // NOVO: Deep link direto do web para app (Android)
  'skyvendaapp://success?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsInJvbGUiOiJjbGllbnRlIiwiZXhwIjoxNzU3NDYwOTQ3fQ.i8eoR-bGjBl0zutNkKAPaWPgFzg_Mk5pFeg2MpsjvLI&id=15',
  
  // URL com parâmetros diferentes
  'https://skyvenda.com/auth/success?token=test123&id=20',
  
  // Teste com token simples
  'skyvendaapp://success?token=test_token_123&id=456'
];

// Como testar:
// 1. Instale o app no dispositivo
// 2. Abra uma das URLs acima no navegador
// 3. O app deve abrir automaticamente
// 4. Deve mostrar a tela "logining" primeiro
// 5. Depois redirecionar para a tela principal
// 6. Verifique os logs no console

console.log('🔗 URLs de teste para Deep Linking:');
testUrls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

console.log('\n📱 Para testar:');
console.log('1. Instale o app no dispositivo');
console.log('2. Abra uma das URLs acima no navegador');
console.log('3. O app deve abrir automaticamente');
console.log('4. Deve mostrar a tela "logining" primeiro');
console.log('5. Depois redirecionar para a tela principal');
console.log('6. Verifique os logs no console do app');

// Exportar para uso em outros arquivos
export default testUrls;
