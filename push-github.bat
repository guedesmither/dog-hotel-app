@echo off
echo ==========================================
echo  Subindo codigo para GitHub
echo ==========================================
echo.

REM Limpar cache do Prisma (evita erro de validacao)
echo Limpando cache do Prisma...
if exist node_modules\.prisma rmdir /s /q node_modules\.prisma 2>nul
echo Cache limpo!
echo.

REM Configurar usuario (ajuste se necessario)
git config user.email "seu-email@exemplo.com"
git config user.name "Seu Nome"

echo Adicionando arquivos...
git add .

echo Criando commit...
git commit -m "Initial commit - PetDay Dog Hotel App" --no-verify

echo.
echo Conectando ao GitHub...
git remote add origin https://github.com/guedesmither/dog-hotel-app.git 2>nul || git remote set-url origin https://github.com/guedesmither/dog-hotel-app.git

echo Mudando para branch main...
git branch -M main

echo.
echo Enviando para GitHub...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ==========================================
    echo  SUCESSO! Codigo enviado!
    echo ==========================================
    echo.
    echo Agora acesse o Vercel para deploy:
    echo https://vercel.com/new
    echo.
    echo Faca login com GitHub e importe:
    echo guedesmither/dog-hotel-app
) else (
    echo ==========================================
    echo  ERRO ao enviar!
    echo ==========================================
    echo.
    echo Verifique:
    echo - Git esta instalado?
    echo - Criou o repositorio no GitHub?
    echo - Esta logado no GitHub?
)

echo.
pause
