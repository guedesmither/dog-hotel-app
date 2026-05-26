@echo off
echo ==========================================
echo  Subindo correcao do import-data
echo ==========================================
echo.

git add app/api/import-data/route.ts export-and-import.bat

echo.
git commit -m "Fix import-data endpoint with correct Prisma fields" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Aguarde o redeploy
echo ==========================================
pause
