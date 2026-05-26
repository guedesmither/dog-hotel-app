@echo off
echo ==========================================
echo  EXPORTAR TUDO (automatico)
echo ==========================================
echo.

REM [1/5] Mudar para SQLite temporariamente
echo [1/5] Configurando SQLite...
powershell -Command "(Get-Content prisma\schema.prisma) -replace 'provider = \"postgresql\"', 'provider = \"sqlite\"' | Set-Content prisma\schema.prisma"

REM [2/5] Gerar Prisma Client
echo [2/5] Gerando Prisma Client...
npx prisma generate

REM [3/5] Exportar dados
echo [3/5] Exportando dados...
node export-data.js

REM [4/5] Voltar para PostgreSQL
echo [4/5] Voltando para PostgreSQL...
powershell -Command "(Get-Content prisma\schema.prisma) -replace 'provider = \"sqlite\"', 'provider = \"postgresql\"' | Set-Content prisma\schema.prisma"

REM [5/5] Subir para GitHub
echo [5/5] Subindo dados para GitHub...
git add data-export.json prisma/schema.prisma
git commit -m "Complete data export with replacements" --no-verify
git push origin main

echo.
echo ==========================================
echo  PRONTO! Aguarde o deploy (2 min)
echo ==========================================
echo Depois acesse: https://guedesmither-dog-hotel-app.vercel.app/admin/import
echo.
pause
