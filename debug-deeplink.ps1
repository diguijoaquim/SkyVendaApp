# Script de Diagnóstico Deep Linking - SkyVenda
Write-Host "🔍 DIAGNÓSTICO DEEP LINKING - SKYVENDA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Verificar se o app está instalado
Write-Host "`n1. Verificando se o app está instalado..." -ForegroundColor Yellow
$appInstalled = adb shell pm list packages | Select-String "com.bluespark.skyvendamz"
if ($appInstalled) {
    Write-Host "✅ App encontrado: $appInstalled" -ForegroundColor Green
} else {
    Write-Host "❌ App NÃO encontrado! Instale o APK primeiro." -ForegroundColor Red
}

# 2. Verificar intent filters
Write-Host "`n2. Verificando intent filters do app..." -ForegroundColor Yellow
adb shell dumpsys package com.bluespark.skyvendamz | Select-String -A 10 -B 2 "android.intent.action.VIEW"

# 3. Testar deep linking
Write-Host "`n3. Testando deep linking..." -ForegroundColor Yellow
Write-Host "Tentando abrir: https://skyvenda.com" -ForegroundColor Cyan
$result = adb shell am start -W -a android.intent.action.VIEW -d "https://skyvenda.com" com.bluespark.skyvendamz 2>&1
Write-Host "Resultado: $result" -ForegroundColor White

# 4. Testar scheme personalizado
Write-Host "`n4. Testando scheme personalizado..." -ForegroundColor Yellow
Write-Host "Tentando abrir: skyvendaapp://home" -ForegroundColor Cyan
$result2 = adb shell am start -W -a android.intent.action.VIEW -d "skyvendaapp://home" com.bluespark.skyvendamz 2>&1
Write-Host "Resultado: $result2" -ForegroundColor White

# 5. Testar deep link de autenticação
Write-Host "`n5. Testando deep link de autenticação..." -ForegroundColor Yellow
Write-Host "Tentando abrir: skyvendaapp://success?token=test_token&id=123" -ForegroundColor Cyan
$result3 = adb shell am start -W -a android.intent.action.VIEW -d "skyvendaapp://success?token=test_token&id=123" com.bluespark.skyvendamz 2>&1
Write-Host "Resultado: $result3" -ForegroundColor White

# 6. Verificar verificação de domínio
Write-Host "`n6. Verificando status de verificação de domínio..." -ForegroundColor Yellow
adb shell dumpsys package domain-preferred-apps | Select-String -A 5 -B 5 "skyvenda"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "🔍 DIAGNÓSTICO CONCLUÍDO" -ForegroundColor Cyan

Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Certifique-se que o arquivo assetlinks.json está em:" -ForegroundColor White
Write-Host "   https://skyvenda.com/.well-known/assetlinks.json" -ForegroundColor Gray
Write-Host "2. Verifique se o app foi buildado com as configurações atuais" -ForegroundColor White
Write-Host "3. Teste manualmente: abra https://skyvenda.com no navegador" -ForegroundColor White
