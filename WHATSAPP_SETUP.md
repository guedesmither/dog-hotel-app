# WhatsApp + Gemini AI - Setup Instructions

## Environment Variables

Add these to your `.env` file (and Vercel environment variables):

```
ZAPI_INSTANCE_ID=your_instance_id_here
ZAPI_TOKEN=your_token_here
ZAPI_CLIENT_TOKEN=your_client_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

## Setup Steps

### 1. Z-API (WhatsApp)
1. Acesse https://z-api.com e crie uma conta
2. Crie uma nova instância (telefone)
3. Escaneie o QR code com seu WhatsApp (Configurações → Aparelhos conectados)
4. No painel da instância, copie:
   - **Instance ID** → `ZAPI_INSTANCE_ID`
   - **Token** → `ZAPI_TOKEN`
   - **Client Token** (em Configurações) → `ZAPI_CLIENT_TOKEN`
5. Configure o webhook na Z-API:
   - URL: `https://yourdomain.com/api/whatsapp/webhook`
   - Eventos: `message-received`, `message-status`

### 2. Google Gemini API
1. Go to https://aistudio.google.com/apikey
2. Create an API key
3. Add it to `GEMINI_API_KEY` env var
4. Free tier: 15 requests/min on Gemini 2.0 Flash

### 3. Features
- **Auto-reply**: Gemini automatically responds to incoming messages (toggleable per conversation)
- **Manual mode**: Human can send messages at any time
- **AI suggestions**: Click the sparkle icon to get a Gemini-suggested response without sending
- **Conversation linking**: Automatically matches phone numbers to dog owners
- **Status banner**: Shows QR code and connection status at the top of the messages page
