@echo off
echo ==========================================
echo  Subindo pagina de importacao (correcao)
echo ==========================================
echo.

git add app/admin/import/page.tsx

echo.
git commit -m "Fix import page location" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
echo ==========================================
pause
