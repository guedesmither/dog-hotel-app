@echo off
cd /d "C:\Users\guede\CascadeProjects\dog-hotel-app"
echo =========================================
echo     DEPLOY DOG HOTEL
echo =========================================
echo.
echo Instalando Vercel localmente (aguarde)...
call npm install vercel --save-dev --silent
echo.
echo Fazendo deploy...
call npx vercel --yes --prod
echo.
echo =========================================
if errorlevel 1 (
    echo     ERRO NO DEPLOY
    echo     Execute no terminal: npx vercel login
) else (
    echo     DEPLOY CONCLUIDO!
)
echo =========================================
pause
