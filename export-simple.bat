@echo off
echo ==========================================
echo  Exportando dados do SQLite
echo ==========================================
echo.

cd C:\Users\guede\CascadeProjects\dog-hotel-app

echo Passo 1: Verificando Prisma...
npx prisma generate

echo.
echo Passo 2: Exportando dados...
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportAll() {
  console.log('Buscando usuarios...');
  const users = await prisma.user.findMany();
  console.log('Usuarios:', users.length);
  
  console.log('Buscando caes...');
  const dogs = await prisma.dog.findMany();
  console.log('Caes:', dogs.length);
  
  console.log('Buscando vendas...');
  const sales = await prisma.sales.findMany();
  console.log('Vendas:', sales.length);
  
  console.log('Buscando agenda...');
  const dailyRosters = await prisma.dailyRoster.findMany();
  console.log('Agenda:', dailyRosters.length);
  
  console.log('Buscando estadias...');
  const stays = await prisma.stay.findMany();
  console.log('Estadias:', stays.length);
  
  const data = { users, dogs, sales, dailyRosters, stays };
  fs.writeFileSync('data-export.json', JSON.stringify(data, null, 2));
  console.log('\\n✅ ARQUIVO CRIADO: data-export.json');
}

exportAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
"

echo.
echo ==========================================
echo  Verifique se o arquivo foi criado
echo ==========================================
dir data-export.json /b 2>nul || echo Arquivo NAO encontrado
echo.
pause
