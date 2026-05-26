@echo off
echo ==========================================
echo  Criando usuarios no banco de dados
echo ==========================================
echo.

cd C:\Users\guede\CascadeProjects\dog-hotel-app

echo Instalando dependencias (se necessario)...
npm install

echo.
echo Gerando Prisma Client...
npx prisma generate

echo.
echo Criando usuarios...
node create-users.js

echo.
echo ==========================================
pause
