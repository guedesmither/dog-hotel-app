@echo off
echo ========================================
echo Migracao do Prisma - Adicionando campos:
echo - serviceDate (dia de execucao)
echo - isExempt (isencao de pagamento)
echo ========================================
echo.
echo Executando migracao...
npx prisma db push
echo.
echo ========================================
echo Migracao concluida!
echo ========================================
pause
