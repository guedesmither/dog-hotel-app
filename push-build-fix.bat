@echo off
echo ==========================================
echo  Subindo correcao do build
echo ==========================================
echo.

git add package.json

echo.
git commit -m "Add prisma db push to build script" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy (pode demorar 2-3 min)
echo ==========================================
pause
