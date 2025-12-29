// Vercel serverless function for handling notification requests
// This works with Vercel's serverless function format
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // CORS headers (allow requests from your domain)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Parse request body (Vercel automatically parses JSON, but handle both cases)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email, phone, countryCode, productName } = body

    // Validate required fields
    if (!email || !phone || !productName) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, phone, and productName are required' 
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Validate phone (should be 10 digits)
    const phoneDigits = phone.replace(/\D/g, '')
    if (phoneDigits.length !== 10) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }

    // Format phone number
    const formattedPhone = `${countryCode || '+1'} ${phoneDigits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}`

    // TODO: Here you would:
    // 1. Save to database (e.g., Supabase, MongoDB, PostgreSQL)
    // 2. Send email notification (e.g., using Resend, SendGrid, or Nodemailer)
    // 3. Send SMS notification (e.g., using Twilio)
    
    // For now, we'll just log and return success
    console.log('Notification request received:', {
      email,
      phone: formattedPhone,
      productName,
      timestamp: new Date().toISOString()
    })

    // Example: Save to a simple JSON file or database
    // In production, you'd want to use a proper database
    
    return res.status(200).json({ 
      success: true,
      message: `We'll notify you at ${email} and ${formattedPhone} when ${productName} is back in stock!`
    })

  } catch (error) {
    console.error('Error processing notification request:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}

