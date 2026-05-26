@echo off
echo ==========================================
echo  Subindo correcao do botao de banho
echo ==========================================
echo.

git add app/api/roster/route.ts

echo.
git commit -m "Fix hasBanho toggle to use upsert" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
echo ==========================================
pause
