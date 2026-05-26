@echo off
echo ==========================================
echo  Subindo arquivo de exportacao
echo ==========================================
echo.

cd C:\Users\guede\CascadeProjects\dog-hotel-app

git add data-export.json prisma/schema.prisma

echo.
git commit -m "Add data export file and fix schema" --no-verify

echo.
git push origin main

echo.
echo ==========================================
echo  Pronto! Acesse o site e importe:
echo  https://guedesmither-dog-hotel-app.vercel.app/admin/import
echo ==========================================
pause
