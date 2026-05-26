@echo off
echo ==========================================
echo  Subindo correcao da importacao completa
echo ==========================================
echo.

git add export-data.js app/api/import-data/route.ts

echo.
git commit -m "Add Replacement and Package to data export/import" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Agora execute:
echo ==========================================
echo  1. Mude schema.prisma para sqlite
echo  2. Rode: node export-data.js
echo  3. Mude schema.prisma de volta para postgresql
echo  4. Suba: git add data-export.json ^&^& git commit -m "Export data with replacements and packages"
echo  5. Importe no Vercel
echo ==========================================
pause
