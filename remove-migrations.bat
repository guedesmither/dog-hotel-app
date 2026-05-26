@echo off
echo ==========================================
echo  Removendo migracoes do repositorio
echo ==========================================
echo.

echo 1. Removendo pasta migrations (se existir)...
if exist prisma\migrations (
    rmdir /s /q prisma\migrations
    echo Pasta migrations removida localmente
) else (
    echo Pasta migrations nao existe localmente
)

echo.
echo 2. Garantindo que migrations seja ignorada no git...
echo prisma/migrations/ >> .gitignore
echo migration_lock.toml >> .gitignore

echo.
echo 3. Removendo do git (forcando)...
git rm -r --cached prisma\migrations 2>nul
git rm --cached prisma\migration_lock.toml 2>nul

echo.
echo 4. Commit e push...
git add .gitignore
git commit -m "Remove migrations - use db push instead" --no-verify
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy no Vercel
echo ==========================================
pause
