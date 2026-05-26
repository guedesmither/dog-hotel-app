@echo off
echo ==========================================
echo  Subindo correcao do middleware
echo ==========================================
echo.

git add middleware.ts

echo.
git commit -m "Allow /api/setup without authentication" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
============================================
pause
