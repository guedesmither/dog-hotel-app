@echo off
echo ==========================================
echo  Subindo correcao final
echo ==========================================
echo.

echo Adicionando arquivos atualizados...
git add netlify.toml vercel.json

echo.
echo Commit...
git commit -m "Remove migrate from build - final fix" --no-verify

echo.
echo Push para GitHub...
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy no Vercel
echo ==========================================
pause
