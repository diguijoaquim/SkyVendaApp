# Script PowerShell para build AAB do SkyVenda App
# Uso: .\build-aab.ps1

Write-Host "🚀 SKYVENDA APP - BUILD AAB" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se npm está disponível
try {
    $npmVersion = npm --version
    Write-Host "✅ NPM: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ NPM não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar se EAS CLI está instalado
Write-Host "`n📦 Verificando EAS CLI..." -ForegroundColor Yellow
try {
    $easVersion = eas --version 2>$null
    Write-Host "✅ EAS CLI: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "📥 Instalando EAS CLI..." -ForegroundColor Yellow
    npm install -g @expo/eas-cli
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar EAS CLI!" -ForegroundColor Red
        exit 1
    }
}

# Verificar login no Expo
Write-Host "`n🔐 Verificando login no Expo..." -ForegroundColor Yellow
try {
    $whoami = eas whoami 2>$null
    Write-Host "✅ Logado como: $whoami" -ForegroundColor Green
} catch {
    Write-Host "🔑 Faça login no Expo:" -ForegroundColor Yellow
    eas login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no login!" -ForegroundColor Red
        exit 1
    }
}

# Fazer o build AAB
Write-Host "`n🔨 Iniciando build AAB..." -ForegroundColor Yellow
Write-Host "⏱️  Este processo pode levar alguns minutos..." -ForegroundColor Gray
Write-Host "📱 Formato: Android App Bundle (AAB)" -ForegroundColor Cyan

try {
    npm run build:aab
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ BUILD AAB CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "📱 O arquivo AAB foi gerado e está disponível no painel do Expo" -ForegroundColor White
        Write-Host "🔗 Acesse: https://expo.dev" -ForegroundColor Cyan
        Write-Host "📋 Use o AAB para publicar na Google Play Store" -ForegroundColor White
    } else {
        throw "Build falhou"
    }
} catch {
    Write-Host "`n❌ ERRO DURANTE O BUILD!" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🎉 Processo concluído!" -ForegroundColor Green

