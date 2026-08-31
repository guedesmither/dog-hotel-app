# WhatsApp Cloud API (Meta) - Setup Instructions

## Environment Variables

Add these to your `.env` file (and Vercel environment variables):

```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_VERIFY_TOKEN=dog_hotel_verify_2024
GEMINI_API_KEY=your_gemini_api_key_here
```

## Setup Steps

### 1. Meta WhatsApp Cloud API
1. Go to https://developers.facebook.com/apps/ and create a new app
2. Add WhatsApp product to the app
3. Get the **Phone Number ID** from the WhatsApp settings page
4. Generate a **permanent access token** (System User token)
5. Configure the webhook:
   - URL: `https://yourdomain.com/api/whatsapp/webhook`
   - Verify token: `dog_hotel_verify_2024` (or whatever you set in WHATSAPP_VERIFY_TOKEN)
   - Subscribe to: `messages` and `message_status`

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
