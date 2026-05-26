@echo off
cd /d C:\Users\guede\CascadeProjects\dog-hotel-app

echo [1/3] Adicionando arquivos...
git add -f "public/logo.png"
git add "app/login/page.tsx"
git add "app/(app)/agenda/page.tsx"
git add "app/(app)/vendas/page.tsx"
git add "app/(app)/financeiro/page.tsx"
git add "app/api/admin/reset-pw/route.ts"

echo [2/3] Commitando...
git commit -m "Fix: mobile responsive + reset-pw endpoint" --no-verify

echo [3/3] Subindo para GitHub...
git push origin main

echo.
echo ==========================================
echo  PRONTO! Aguarde 2 min o deploy no Vercel
echo  Depois acesse para importar os dados:
echo  https://guedesmither-dog-hotel-app.vercel.app/admin/import
echo ==========================================
pause
