# 🚀 Deploy AU-Ê Petcare — Acesso Online pelo Celular

## Como funciona
O portal é um **site web** (não precisa de App Store). Qualquer celular iOS ou Android
acessa pelo Safari/Chrome. Você pode até **adicionar na tela inicial** para parecer um app.

---

## Passo a passo: Railway.app (Recomendado, gratuito para começar)

### 1. Criar conta no Railway
- Acesse https://railway.app e crie uma conta gratuita (login com GitHub)

### 2. Colocar o código no GitHub
- Acesse https://github.com e crie uma conta se não tiver
- Crie um repositório privado chamado `aue-petcare`
- No terminal do projeto, execute:
  ```
  git init
  git add .
  git commit -m "Primeiro deploy"
  git remote add origin https://github.com/SEU_USUARIO/aue-petcare.git
  git push -u origin main
  ```

### 3. Criar projeto no Railway
- No Railway, clique em **"New Project"**
- Escolha **"Deploy from GitHub repo"**
- Selecione o repositório `aue-petcare`

### 4. Adicionar banco de dados PostgreSQL
- No projeto Railway, clique em **"+ New"** → **"Database"** → **"PostgreSQL"**
- O Railway cria o banco automaticamente e gera a variável `DATABASE_URL`

### 5. Configurar variáveis de ambiente
No Railway, clique no serviço principal → **"Variables"** → adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_URL` | *(copiado automaticamente do PostgreSQL add-on)* |
| `NEXTAUTH_SECRET` | *(gere uma senha longa e aleatória, ex: `aue-petcare-secret-2024-xYz9`)* |
| `NEXTAUTH_URL` | *(URL do seu app, ex: `https://aue-petcare.railway.app`)* |

### 6. Deploy automático
- O Railway faz o build e deploy automaticamente
- Em ~3 minutos o app estará online

### 7. Acessar pelo iPhone
- Copie a URL gerada (ex: `https://aue-petcare.railway.app`)
- Abra no **Safari** do iPhone
- Toque em **Compartilhar** → **"Adicionar à Tela de Início"**
- O portal vira um ícone na tela inicial, como um app! 🐾

---

## 💡 Adicionar à Tela Inicial no iPhone (passo a passo)
1. Abra o Safari e acesse a URL do portal
2. Toque no ícone de **compartilhar** (quadrado com seta para cima)
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Dê o nome "AU-Ê Petcare" e confirme
5. Pronto — ícone aparece na tela inicial!

---

## Custos Railway
- **Grátis**: $5 de crédito/mês (cobre apps pequenos)
- **Hobby plan**: $5/mês para apps em produção 24/7
- Sem surpresas: o billing é transparente e tem limite configurável

---

## Dados seguros
- O banco PostgreSQL fica no próprio Railway, com backup automático
- Todas as fotos ficam na pasta `/uploads` do servidor
- Para maior segurança das fotos em produção, pode-se migrar para Cloudinary (gratuito até 25GB)
