@echo off
echo ==========================================
echo  Configurando Git para PetDay Dog Hotel
echo ==========================================
echo.

REM Verificar se git existe
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Git nao encontrado!
    echo.
    echo Instale o Git primeiro:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo Git encontrado!
echo.

REM Inicializar repositorio
git init
echo.

REM Configurar usuario (ajuste se necessario)
git config user.email "seu-email@exemplo.com"
git config user.name "Seu Nome"

REM Adicionar arquivos
git add .

REM Commit inicial
git commit -m "Initial commit - PetDay Dog Hotel App"

echo.
echo ==========================================
echo  Proximos passos:
echo ==========================================
echo.
echo 1. Crie um repositorio no GitHub:
echo    https://github.com/new
echo.
echo 2. De o nome: dog-hotel-app
echo.
echo 3. Execute estes comandos (substitua SEU_USUARIO):
echo.
echo    git remote add origin https://github.com/SEU_USUARIO/dog-hotel-app.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. Acesse o Vercel e importe:
echo    https://vercel.com/new
echo.

pause
