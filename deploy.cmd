@echo off
cd /d "C:\Users\guede\CascadeProjects\dog-hotel-app"
echo =========================================
echo     DEPLOY DOG HOTEL - VERCEL
echo =========================================
echo.

echo Verificando instalacao do Vercel...
if exist node_modules\vercel (
    echo Vercel ja instalado localmente...
) else (
    echo Instalando Vercel localmente...
    call npm install vercel --save-dev
)

echo.
echo Fazendo deploy...
call npx vercel --yes --prod
if errorlevel 1 (
    echo.
    echo ERRO no deploy! Tentando login primeiro...
    call npx vercel login
    echo.
    echo Tentando deploy novamente...
    call npx vercel --yes --prod
)

echo.
echo =========================================
echo     DEPLOY CONCLUIDO!
echo =========================================
echo.
pause
