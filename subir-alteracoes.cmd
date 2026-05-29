@echo off
cd /d "C:\Users\guede\CascadeProjects\dog-hotel-app"
echo =========================================
echo     ENVIAR ALTERACOES PARA O GITHUB
echo =========================================
echo.
echo Adicionando todos os arquivos modificados...
git add -A
echo.
echo Criando commit com as alteracoes...
git commit -m "fix: tabela de vendas mostra periodo de vigencia para mensal/hotel/pacote"
echo.
echo Enviando para o GitHub...
git push origin main
echo.
echo =========================================
if errorlevel 1 (
    echo     ERRO AO ENVIAR
    echo     Verifique se esta logado no Git
) else (
    echo     ALTERACOES ENVIADAS!
    echo     A Vercel vai atualizar automaticamente
    echo     Aguarde 2-3 minutos e atualize o site
)
echo =========================================
pause
