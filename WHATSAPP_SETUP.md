# WhatsApp + Gemini AI - Setup Instructions

## Environment Variables

Add these to your `.env` file (and Vercel environment variables):

```
EVOLUTION_API_URL=https://your-evolution-api-server.com
EVOLUTION_API_KEY=your_api_key_here
EVOLUTION_INSTANCE_NAME=your_instance_name_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Setup Steps

### 1. Evolution API (WhatsApp) — GRÁTIS
1. Hospede a Evolution API (recomendado: Render.com ou Railway.app tier gratuito)
   - Repo oficial: https://github.com/EvolutionAPI/evolution-api
   - Siga as instruções de deploy no README
2. Crie uma instância na Evolution API:
   ```
   POST https://your-evolution-api-server.com/instance/create
   Headers: apikey: YOUR_GLOBAL_API_KEY
   Body: { "instanceName": "my-instance", "token": "your-instance-token" }
   ```
3. Conecte via QR code:
   - Chame `GET /instance/connect/my-instance`
   - Escaneie o QR code com seu WhatsApp (Configurações → Aparelhos conectados)
4. Configure o webhook:
   ```
   POST https://your-evolution-api-server.com/webhook/set/my-instance
   Headers: apikey: YOUR_INSTANCE_TOKEN
   Body: {
     "enabled": true,
     "url": "https://yourdomain.com/api/whatsapp/webhook",
     "webhookByEvents": false,
     "webhookBase64": false,
     "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
   }
   ```
5. Copie para suas variáveis de ambiente:
   - **URL do servidor** → `EVOLUTION_API_URL`
   - **API Key** (global ou da instância) → `EVOLUTION_API_KEY`
   - **Nome da instância** → `EVOLUTION_INSTANCE_NAME`

### 2. Google Gemini API
1. Go to https://aistudio.google.com/apikey
2. Create an API key
3. Add it to `GEMINI_API_KEY` env var
4. Free tier: 15 requests/min on Gemini 2.0 Flash

### 3. Features
- **Manual mode**: Human can send messages at any time
- **AI suggestions**: Click the sparkle icon to get a Gemini-suggested response without sending
- **Conversation linking**: Automatically matches phone numbers to dog owners
- **Status banner**: Shows QR code and connection status at the top of the messages page
- **Daily reports**: AI-generated daily summaries sent to tutors via WhatsApp
