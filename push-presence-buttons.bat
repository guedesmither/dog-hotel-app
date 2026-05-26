@echo off
echo ==========================================
echo  Subindo botoes separados de presenca/falta
echo ==========================================
echo.

git add app/(app)/agenda/page.tsx

echo.
git commit -m "Add separate Present and Absent buttons for better UX" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy (2 min)
echo ==========================================
pause
