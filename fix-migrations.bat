@echo off
echo ==========================================
echo  Corrigindo migracoes para PostgreSQL
echo ==========================================
echo.

echo 1. Deletando migracoes antigas (SQLite)...
if exist prisma\migrations (
    rmdir /s /q prisma\migrations
    echo Migracoes antigas removidas!
) else (
    echo Pasta migrations nao existe (ja foi removida)
)

echo.
echo 2. Criando nova migracao para PostgreSQL...
npx prisma migrate dev --name init_postgres --create-only

echo.
echo 3. Subindo codigo atualizado...
git add .
git commit -m "Fix migrations for PostgreSQL" --no-verify
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy no Vercel
echo ==========================================
pause
