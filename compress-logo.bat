@echo off
cd /d C:\Users\guede\CascadeProjects\dog-hotel-app

echo Instalando sharp temporariamente...
npm install sharp --save-dev
echo --- npm install concluido, pressione tecla para continuar ---
pause

echo Comprimindo logo...
node -e "const sharp=require('sharp'); sharp('public/logo.png').resize(400).png({quality:80,compressionLevel:9}).toFile('public/logo-compressed.png', (e,i)=>{ if(e) console.error(e); else { console.log('OK! De',Math.round(require('fs').statSync('public/logo.png').size/1024),'KB para',Math.round(i.size/1024),'KB'); require('fs').renameSync('public/logo-compressed.png','public/logo.png'); } });"
echo --- compressao concluida ---
timeout /t 5

echo Commitando logo comprimido...
git add -f "public/logo.png"
git commit -m "Compress: logo.png reduzido" --no-verify
git push origin main

echo PRONTO!
pause
