@echo off
echo ==========================================
echo  Exportando dados do SQLite local
echo  e importando para PostgreSQL (Vercel)
echo ==========================================
echo.

cd C:\Users\guede\CascadeProjects\dog-hotel-app

echo 1. Gerando Prisma Client...
npx prisma generate

echo.
echo 2. Criando script de exportacao...
echo.

echo const { PrismaClient } = require('@prisma/client'); > export-data.js
echo const fs = require('fs'); >> export-data.js
echo. >> export-data.js
echo async function exportData() { >> export-data.js
echo   const prisma = new PrismaClient(); >> export-data.js
echo   try { >> export-data.js
echo     console.log('Exportando dados...'); >> export-data.js
echo. >> export-data.js
echo     const users = await prisma.user.findMany(); >> export-data.js
echo     const dogs = await prisma.dog.findMany(); >> export-data.js
echo     const sales = await prisma.sales.findMany(); >> export-data.js
echo     const dailyRosters = await prisma.dailyRoster.findMany(); >> export-data.js
echo     const stays = await prisma.stay.findMany(); >> export-data.js
echo. >> export-data.js
echo     const data = { users, dogs, sales, dailyRosters, stays }; >> export-data.js
echo     fs.writeFileSync('data-export.json', JSON.stringify(data, null, 2)); >> export-data.js
echo     console.log('Dados exportados para data-export.json'); >> export-data.js
echo     console.log(`Usuarios: ${users.length}`); >> export-data.js
echo     console.log(`Caes: ${dogs.length}`); >> export-data.js
echo     console.log(`Vendas: ${sales.length}`); >> export-data.js
echo     console.log(`Agenda: ${dailyRosters.length}`); >> export-data.js
echo     console.log(`Estadias: ${stays.length}`); >> export-data.js
echo   } finally { >> export-data.js
echo     await prisma.$disconnect(); >> export-data.js
echo   } >> export-data.js
echo } >> export-data.js
echo. >> export-data.js
echo exportData(); >> export-data.js

echo.
echo 3. Exportando dados do SQLite...
node export-data.js

echo.
echo 4. Para importar os dados no Vercel, acesse:
echo    https://guedesmither-dog-hotel-app.vercel.app/api/import-data
echo.
echo    E envie o conteudo do arquivo data-export.json via POST
echo.
echo 5. Ou use curl (se tiver instalado):
echo    curl -X POST https://guedesmither-dog-hotel-app.vercel.app/api/import-data ^
echo         -H "Content-Type: application/json" ^
echo         -d @data-export.json
echo.
echo ==========================================
echo  Exportacao concluida!
echo  Verifique o arquivo data-export.json
echo ==========================================
pause
