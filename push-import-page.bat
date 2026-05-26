@echo off
echo ==========================================
echo  Subindo pagina de importacao
echo ==========================================
echo.

git add app/(app)/admin/import/page.tsx

echo.
git commit -m "Add import data page" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
echo ==========================================
pause
