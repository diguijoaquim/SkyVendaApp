# 🔍 CHECKLIST: Por que o Deep Linking não funciona?

## ❗ PROBLEMAS MAIS COMUNS:

### 1. **Arquivo assetlinks.json não está no servidor** ⚠️
- [ ] O arquivo `.well-known/assetlinks.json` está em `https://skyvenda.com/.well-known/assetlinks.json`?
- [ ] O arquivo está acessível publicamente (teste no navegador)?
- [ ] O servidor retorna `Content-Type: application/json`?

**TESTE AGORA:**
Abra no navegador: `https://skyvenda.com/.well-known/assetlinks.json`
Se der erro 404, o arquivo não está lá!

---

### 2. **App não foi buildado com as configurações atuais** ⚠️
- [ ] Você fez `npx expo prebuild --clean` após as mudanças?
- [ ] Você fez um novo build APK após as mudanças no `app.json`?
- [ ] O APK instalado é o mais recente?

**FAÇA AGORA:**
```bash
npx expo prebuild --clean
npm run build:apk
```

---

### 3. **Fingerprint SHA256 não confere** ⚠️
- [ ] O fingerprint no `assetlinks.json` é do APK atual?
- [ ] Se você tem certificados diferentes (dev/prod), ambos estão no arquivo?

**VERIFIQUE:**
- Fingerprint 1: `E6:11:56:61:A0:E5:8C:12:22:4A:C5:36:A8:F2:74:37:66:28:51:1F:5A:E6:F8:38:D3:51:FD:1E:F2:D7:97:63`
- Fingerprint 2: `86:42:4C:85:2F:16:D3:6C:5B:78:C1:58:F3:EA:90:97:1C:86:39:05`

---

### 4. **Cache do Android** ⚠️
O Android pode ter cached uma verificação falhada.

**LIMPE O CACHE:**
- Vá em Configurações > Apps > SkyVenda > Armazenamento > Limpar Cache
- Ou desinstale e reinstale o app

---

### 5. **Teste Manual** 📱

**PASSOS PARA TESTAR:**
1. Instale o APK mais recente
2. Abra o Chrome/navegador
3. Digite: `https://skyvenda.com`
4. O Android deve mostrar um popup perguntando qual app abrir
5. Escolha "SkyVenda" (não "Chrome" ou "Navegador")

**SE NÃO APARECER O POPUP:**
- O arquivo `assetlinks.json` não está acessível
- O fingerprint está errado
- O app não foi buildado com as configurações corretas

---

## 🚨 SOLUÇÃO RÁPIDA:

### PASSO 1: Verificar arquivo no servidor
```bash
curl -I https://skyvenda.com/.well-known/assetlinks.json
```
Se der erro 404 → **PROBLEMA ENCONTRADO!** Faça upload do arquivo.

### PASSO 2: Rebuild completo
```bash
npx expo prebuild --clean
npm run build:apk
```

### PASSO 3: Teste no navegador
Abra `https://skyvenda.com` no Chrome do celular.

---

## 🔧 DEBUG AVANÇADO:

Se ainda não funcionar, verifique:

1. **Logs do Android:**
```bash
adb logcat | findstr "IntentFilter\|skyvenda\|deeplink"
```

2. **Verificação de domínio:**
```bash
adb shell dumpsys package domain-preferred-apps
```

3. **Intent filters instalados:**
```bash
adb shell dumpsys package com.bluespark.skyvendamz
```

---

## ✅ RESULTADO ESPERADO:

Quando funcionar, ao abrir `https://skyvenda.com` no navegador:
1. Aparecerá um popup "Abrir com"
2. Opções: "Chrome", "SkyVenda", etc.
3. Escolha "SkyVenda"
4. O app abrirá diretamente!

**Qual desses passos você ainda não fez?**
