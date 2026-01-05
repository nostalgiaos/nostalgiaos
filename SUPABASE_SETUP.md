# Supabase Setup Guide

## ✅ What's Been Done

1. ✅ Supabase client script added to `index.html`
2. ✅ Form submission updated to use Supabase instead of API endpoint
3. ✅ Phone number is now optional
4. ✅ Duplicate email handling (shows friendly message if already on list)

## 📋 Next Steps

### 1. Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to finish setting up (takes ~2 minutes)

### 2. Create the `waitlist` Table

In Supabase Dashboard:

1. Go to **Table Editor** → **New Table**
2. Name it: `waitlist`
3. Add these columns:

| Column Name | Type | Default | Nullable | Unique |
|------------|------|---------|----------|--------|
| `id` | `uuid` | `gen_random_uuid()` | ❌ | ✅ (Primary Key) |
| `email` | `text` | - | ❌ | ✅ |
| `phone` | `text` | - | ✅ | ❌ |
| `product_name` | `text` | - | ✅ | ❌ |
| `created_at` | `timestamptz` | `now()` | ❌ | ❌ |

**Important:** Make `email` unique to prevent duplicates!

### 3. Get Your Supabase Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 4. Update `index.html`

Replace the placeholder values in `index.html`:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

With your actual values:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';  // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGc...';  // Your anon public key
```

### 5. Test Locally

1. Open `index.html` in your browser (or run your dev server)
2. Click "Notify Me" on any product
3. Submit the form with:
   - A real email address
   - Phone number (optional)
4. Check Supabase → **Table Editor** → `waitlist` to see your entry
5. Try submitting the same email again → should show "You're already on the list ✔"

### 6. Deploy to Vercel

Once it works locally:

```bash
git add .
git commit -m "Integrate Supabase for waitlist collection"
git push
```

Vercel will automatically deploy. Test the live site!

## 🎯 What You Can Do Now

- ✅ Collect emails & phone numbers
- ✅ Export your waitlist from Supabase anytime
- ✅ Set up email/SMS notifications later
- ✅ Track which products people are interested in

## 🔒 Security Note

The `anon public` key is safe to expose in frontend code. Supabase uses Row Level Security (RLS) to protect your data. Make sure to enable RLS policies if you want to restrict access later.

## 📊 Viewing Your Data

Go to Supabase → **Table Editor** → `waitlist` to see all submissions. You can export as CSV or connect to other tools.


