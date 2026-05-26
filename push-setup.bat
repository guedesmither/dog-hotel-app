@echo off
echo ==========================================
echo  Subindo endpoint de setup
echo ==========================================
echo.

git add app/api/setup/route.ts

echo.
git commit -m "Add setup endpoint for initial users" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
============================================
pause
