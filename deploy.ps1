# Script de Deploy - Frutifica Sistema
# Execute este script sempre que quiser fazer deploy de novas alterações

Write-Host "🚀 Iniciando processo de deploy..." -ForegroundColor Cyan
Write-Host ""

# Verificar se há alterações
Write-Host "📋 Verificando alterações..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Deseja continuar com o commit e push? (S/N)" -ForegroundColor Yellow
$resposta = Read-Host

if ($resposta -eq "S" -or $resposta -eq "s") {
    # Adicionar todos os arquivos
    Write-Host ""
    Write-Host "📦 Adicionando arquivos..." -ForegroundColor Green
    git add .
    
    # Solicitar mensagem de commit
    Write-Host ""
    Write-Host "📝 Digite a mensagem do commit:" -ForegroundColor Yellow
    $mensagem = Read-Host
    
    # Fazer commit
    Write-Host ""
    Write-Host "💾 Fazendo commit..." -ForegroundColor Green
    git commit -m "$mensagem"
    
    # Push para o GitHub
    Write-Host ""
    Write-Host "🌐 Enviando para o GitHub..." -ForegroundColor Green
    git push origin main
    
    Write-Host ""
    Write-Host "✅ Deploy iniciado! O Easy Panel fará o build automaticamente." -ForegroundColor Green
    Write-Host "🔗 Acesse o painel do Easy Panel para acompanhar o progresso." -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deploy cancelado." -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
