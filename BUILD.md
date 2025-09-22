# 📱 SkyVenda App - Guia de Build

## 🏗️ Tipos de Build Disponíveis

### AAB (Android App Bundle) - **RECOMENDADO** 
```bash
npm run build:aab
```
- **Formato**: Android App Bundle (.aab)
- **Uso**: Google Play Store (produção)
- **Vantagens**: Otimização automática, menor download
- **Perfil EAS**: `production`

### APK (Android Package)
```bash
npm run build:apk
```
- **Formato**: Android Package (.apk)
- **Uso**: Testes, distribuição direta
- **Vantagens**: Instalação direta no dispositivo
- **Perfil EAS**: `production-apk`

### Desenvolvimento
```bash
npm run build:dev
```
- **Formato**: APK com Development Client
- **Uso**: Desenvolvimento e testes
- **Perfil EAS**: `development`

### Preview
```bash
npm run build:preview
```
- **Formato**: APK para testes internos
- **Uso**: Testes internos da equipe
- **Perfil EAS**: `preview`

## 🚀 Scripts Automatizados

### PowerShell (Windows)
```powershell
.\build-aab.ps1
```

### Node.js (Multiplataforma)
```bash
node build-aab.js
```

## 📋 Pré-requisitos

1. **Node.js** (v18 ou superior)
2. **EAS CLI** (instalado automaticamente pelos scripts)
3. **Conta Expo** (login necessário)
4. **Configuração do projeto** no Expo

## 🔧 Configuração EAS

O arquivo `eas.json` está configurado com os seguintes perfis:

```json
{
  "build": {
    "development": { "buildType": "apk" },
    "preview": { "buildType": "apk" },
    "production": { "buildType": "app-bundle" },
    "production-apk": { "buildType": "apk" }
  }
}
```

## 📱 Deep Linking

O app está configurado com:
- **Scheme**: `skyvendaapp://`
- **Domain**: `skyvenda.com`
- **Intent Filters**: Configurados para Android

### Teste de Deep Link
```bash
# Via ADB
adb shell am start -W -a android.intent.action.VIEW -d "skyvendaapp://success?token=test&id=123" com.bluespark.skyvendamz

# Via PowerShell
.\debug-deeplink.ps1
```

## 🏪 Publicação

### Google Play Store
1. Use o build **AAB**: `npm run build:aab`
2. Faça download do arquivo .aab do painel Expo
3. Faça upload na Google Play Console

### Distribuição Direta
1. Use o build **APK**: `npm run build:apk`
2. Faça download do arquivo .apk do painel Expo
3. Instale diretamente no dispositivo

## 🔗 Links Úteis

- **Painel Expo**: https://expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Google Play Console**: https://play.google.com/console

## 🆘 Solução de Problemas

### Erro de Login
```bash
eas login
```

### Build Falha
```bash
eas build --clear-cache --platform android --profile production
```

### Logs Detalhados
```bash
eas build --platform android --profile production --verbose
```

