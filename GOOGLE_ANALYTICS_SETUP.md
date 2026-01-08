# Google Analytics 4 Setup Guide

## ✅ What's Been Done

1. ✅ Google Analytics 4 script added to `index.html`
2. ✅ Page view tracking added to all navigation functions:
   - Home page
   - Softwear page
   - Hardwear page
   - Basket page
   - Product detail pages
   - Legal pages (Terms, Privacy, Shipping, Returns)

## 📋 Next Steps: Get Your GA4 Measurement ID

### 1. Create a Google Analytics Account

1. Go to [analytics.google.com](https://analytics.google.com)
2. Sign in with your Google account
3. Click "Start measuring" or "Create Account"

### 2. Set Up a Property

1. Enter a **Property name** (e.g., "Nostalgia OS")
2. Select your **Reporting time zone** and **Currency**
3. Click "Next"

### 3. Get Your Measurement ID

1. After creating the property, you'll see a **Measurement ID**
2. It looks like: `G-XXXXXXXXXX` (starts with "G-" followed by 10 characters)
3. Copy this ID

### 4. Update Your Code

Replace `G-XXXXXXXXXX` in **two places**:

**File: `index.html`** (lines 35 and 40)
```html
<!-- Replace both instances of G-XXXXXXXXXX with your actual Measurement ID -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');  <!-- Replace this one too -->
</script>
```

**File: `src/main.js`** (line 6)
```javascript
// Replace G-XXXXXXXXXX with your actual Measurement ID
function trackPageView(pageName) {
  if (typeof gtag !== 'undefined') {
    gtag('config', 'G-XXXXXXXXXX', {  // Replace this
      page_path: `/${pageName}`,
      page_title: pageName
    })
  }
}
```

### 5. Test It

1. Save your changes
2. Deploy to your site
3. Visit your site and navigate between pages
4. Go to Google Analytics → **Reports** → **Realtime**
5. You should see your visit appear within a few seconds!

## 📊 What You Can Track

Once set up, you'll be able to see:
- **Number of visitors** (daily, weekly, monthly)
- **Page views** (which pages are most popular)
- **User demographics** (location, device, browser)
- **User behavior** (how long they stay, which pages they visit)
- **Traffic sources** (where visitors come from)
- **Product views** (which products get the most views)

## 🔍 Viewing Your Data

1. Go to [analytics.google.com](https://analytics.google.com)
2. Select your property
3. Check out:
   - **Realtime**: See visitors right now
   - **Reports**: See historical data
   - **Engagement**: See which pages are popular
   - **Acquisition**: See where traffic comes from

## 🎯 Pro Tips

- Data can take 24-48 hours to fully populate in standard reports
- Realtime reports show data immediately
- You can set up custom events (like button clicks) later if needed
- Consider setting up goals/conversions for important actions (like email signups)

