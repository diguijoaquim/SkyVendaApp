# 🔗 Troubleshooting Deep Linking - SkyVenda

## ✅ Passos para Resolver o Problema

### 1. **Verificar se o assetlinks.json está no servidor**
```bash
# Teste se o arquivo está acessível
curl https://skyvenda.com/.well-known/assetlinks.json

# Deve retornar o JSON com o fingerprint
```

### 2. **Obter o Fingerprint SHA256 Correto**
```bash
# Se você tem o APK, extraia o fingerprint:
keytool -printcert -jarfile app-release.apk

# Ou se você tem a keystore:
keytool -list -v -keystore your-keystore.jks -alias your-alias
```

### 3. **Verificar a Configuração do Android**
- O `package_name` deve ser: `com.bluespark.skyvendamz`
- O fingerprint deve corresponder ao certificado usado para assinar o APK

### 4. **Testar o Deep Linking**
```bash
# Teste com ADB (Android Debug Bridge)
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "https://skyvenda.com" \
  com.bluespark.skyvendamz

# Ou teste o scheme personalizado:
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "skyvendaapp://home" \
  com.bluespark.skyvendamz
```

### 5. **Verificar se o App está instalado**
```bash
# Verificar se o app está instalado
adb shell pm list packages | grep skyvendamz
```

## 🚨 Possíveis Problemas

### Problema 1: Arquivo assetlinks.json não está acessível
**Solução:** Upload o arquivo `.well-known/assetlinks.json` para o servidor `skyvenda.com`

### Problema 2: Fingerprint SHA256 incorreto
**Solução:** 
1. Obtenha o fingerprint correto do APK/certificado
2. Atualize o arquivo `assetlinks.json`
3. Faça upload para o servidor

### Problema 3: App não foi buildado com a nova configuração
**Solução:**
```bash
# Rebuild do app com as novas configurações
npx expo prebuild --clean
npm run build:apk
```

### Problema 4: Cache do Android
**Solução:**
```bash
# Limpar cache do app
adb shell pm clear com.bluespark.skyvendamz
```

## 🔄 Próximos Passos

1. ✅ Configuração do `app.json` - **FEITO**
2. ⚠️  Upload do `assetlinks.json` para o servidor - **PENDENTE**
3. ⚠️  Verificar fingerprint SHA256 - **PENDENTE**
4. ⚠️  Rebuild do app - **PENDENTE**
5. ⚠️  Testar deep linking - **PENDENTE**
