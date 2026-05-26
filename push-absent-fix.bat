@echo off
echo ==========================================
echo  Subindo correcao: botoes de falta para todos
echo ==========================================
echo.

git add app/(app)/agenda/page.tsx

echo.
git commit -m "Show present/absent buttons for all dog types" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy (2 min)
echo ==========================================
pause
