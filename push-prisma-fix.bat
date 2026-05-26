@echo off
echo ==========================================
echo  Subindo correcao do Prisma Client
echo ==========================================
echo.

echo Adicionando package.json atualizado...
git add package.json

echo.
echo Commit...
git commit -m "Add postinstall script for Prisma Client" --no-verify

echo.
echo Push para GitHub...
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy no Vercel
echo ==========================================
pause
