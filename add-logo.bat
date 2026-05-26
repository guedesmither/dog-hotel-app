@echo off
cd /d C:\Users\guede\CascadeProjects\dog-hotel-app

echo Verificando status do logo...
git status public/logo.png

echo.
echo Forcando adicao do logo...
git add -f public/logo.png

echo.
echo Status apos adicao:
git status public/logo.png

echo.
echo Commitando...
git commit -m "Add logo.png" --no-verify

echo.
echo Subindo...
git push origin main

echo.
echo PRONTO!
pause
