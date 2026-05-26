@echo off
echo ==========================================
echo  Subindo correcao do Vercel config
echo ==========================================
echo.

echo Adicionando vercel.json atualizado...
git add vercel.json

echo.
echo Commit...
git commit -m "Fix vercel.json - remove migrate from build" --no-verify

echo.
echo Push para GitHub...
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy no Vercel
echo ==========================================
pause
