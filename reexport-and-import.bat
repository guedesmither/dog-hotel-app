@echo off
echo ==========================================
echo  RE-EXPORTAR DADOS COMPLETOS (com reposicoes)
echo ==========================================
echo.
echo ATENCAO: Verifique se schema.prisma esta em SQLITE!
echo.

echo [1/2] Gerando Prisma Client...
npx prisma generate

echo.
echo [2/2] Exportando dados...
node export-data.js

echo.
echo ==========================================
echo  DADOS EXPORTADOS!
echo ==========================================
echo.
echo Agora:
echo 1. Mude schema.prisma de volta para postgresql
echo 2. Execute: git add data-export.json ^&^& git commit -m "Complete data export" ^&^& git push
echo 3. Aguarde deploy e importe no Vercel
echo ==========================================
pause
