@echo off
cd C:\Users\guede\CascadeProjects\dog-hotel-app
npx prisma generate
node export-data.js
echo.
echo Arquivo criado! Pressione qualquer tecla para sair.
pause
