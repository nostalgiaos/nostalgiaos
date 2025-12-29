# API Setup Guide

## Current Setup

The notification API is set up as a Vercel serverless function. It's ready to use but currently just logs the data and returns a success message.

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy your site**:
   ```bash
   vercel
   ```
   
   Follow the prompts to link your project.

3. **The API will automatically work** at `https://your-site.vercel.app/api/notify`

### Option 2: Netlify

1. Create a `netlify.toml` file (I can help with this)
2. Deploy to Netlify
3. The API will work at `https://your-site.netlify.app/api/notify`

### Option 3: Local Development

For local development with Vercel:

```bash
npm i -g vercel
vercel dev
```

This will run your site locally with the API working.

## Next Steps: Adding Real Functionality

### 1. Save to Database

You can use:
- **Supabase** (free tier, PostgreSQL)
- **MongoDB Atlas** (free tier)
- **PlanetScale** (free tier, MySQL)

Example with Supabase:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

await supabase
  .from('notifications')
  .insert([{ email, phone, product_name: productName, created_at: new Date() }])
```

### 2. Send Email Notifications

Use **Resend** (free tier, easy setup):
```bash
npm install resend
```

Then in `api/notify.js`:
```javascript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'notifications@yourdomain.com',
  to: email,
  subject: `You'll be notified when ${productName} is back in stock!`,
  html: `<p>We'll notify you when ${productName} is back in stock!</p>`
})
```

### 3. Send SMS Notifications

Use **Twilio** (pay-as-you-go):
```bash
npm install twilio
```

Then in `api/notify.js`:
```javascript
import twilio from 'twilio'
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

await client.messages.create({
  body: `You'll be notified when ${productName} is back in stock!`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: formattedPhone
})
```

## Environment Variables

Add these to your Vercel project settings (or `.env.local` for local dev):
- `RESEND_API_KEY` (if using Resend)
- `SUPABASE_URL` and `SUPABASE_KEY` (if using Supabase)
- `TWILIO_*` variables (if using Twilio)

## Testing

The API endpoint is at: `/api/notify`

It expects a POST request with:
```json
{
  "email": "user@example.com",
  "phone": "1234567890",
  "countryCode": "+1",
  "productName": "the essentials"
}
```

## Current Status

✅ API endpoint created
✅ Frontend connected to API
✅ Error handling in place
⏳ Database storage (ready to add)
⏳ Email notifications (ready to add)
⏳ SMS notifications (ready to add)

