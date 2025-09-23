const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { name, email, subject, priority, message, timestamp, userEmail, userId, userAgent } = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!name || !email || !subject || !message) {
      console.error('❌ Missing required fields:', {
        name: !!name,
        email: !!email,
        subject: !!subject,
        message: !!message
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          details: 'Name, email, subject, and message are required'
        })
      };
    }

    // Configure SendGrid
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@selira.ai';
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@selira.ai';

    if (!SENDGRID_API_KEY) {
      console.error('❌ Missing SendGrid API key');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Email service configuration missing' })
      };
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    console.log('📧 Processing contact form submission:', {
      name,
      email,
      subject,
      priority,
      hasUserId: !!userId
    });

    // Format priority level
    const priorityLabel = {
      'low': 'Low Priority',
      'medium': 'Medium Priority',
      'high': 'High Priority ⚠️',
      'critical': 'CRITICAL - Service Disruption 🚨'
    }[priority] || 'Medium Priority';

    // Create email content
    const emailContent = `
New Contact Form Submission - ${priorityLabel}

=== CONTACT DETAILS ===
Name: ${name}
Email: ${email}
Subject: ${subject}
Priority: ${priorityLabel}
Submitted: ${timestamp || new Date().toISOString()}

${userId ? `User ID: ${userId}` : ''}
${userEmail && userEmail !== email ? `Logged in as: ${userEmail}` : ''}

=== MESSAGE ===
${message}

=== TECHNICAL INFO ===
User Agent: ${userAgent || 'Not provided'}
Source: Contact Form - selira.ai/contact

=== NEXT STEPS ===
${priority === 'critical' ? '🚨 URGENT: This is a critical issue requiring immediate attention!' : ''}
${priority === 'high' ? '⚠️ High priority - respond within 4 hours' : ''}
${priority === 'medium' ? 'Standard priority - respond within 24 hours' : ''}
${priority === 'low' ? 'Low priority - respond within 48 hours' : ''}
`;

    // Send email to support team
    const supportMsg = {
      to: SUPPORT_EMAIL,
      from: FROM_EMAIL,
      subject: `[${priorityLabel}] Contact Form: ${subject}`,
      text: emailContent,
      replyTo: email
    };

    // Send confirmation email to user
    const confirmationMsg = {
      to: email,
      from: FROM_EMAIL,
      subject: 'We received your message - Selira AI Support',
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-family: 'Playfair Display', serif; font-size: 28px; color: #d4a574; margin: 0;">Selira AI</h1>
          </div>

          <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 16px;">Thank you for contacting us!</h2>

          <p style="color: #b3b3b3; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${name},
          </p>

          <p style="color: #b3b3b3; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            We've received your message about "<strong style="color: #ffffff;">${subject}</strong>" and our support team will get back to you soon.
          </p>

          <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #d4a574; margin-bottom: 24px;">
            <h3 style="color: #d4a574; font-size: 18px; margin-bottom: 12px;">What happens next?</h3>
            <ul style="color: #b3b3b3; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">We'll review your message and assess the priority level</li>
              <li style="margin-bottom: 8px;">${priority === 'critical' ? 'Critical issues receive immediate attention' : priority === 'high' ? 'High priority messages get a response within 4 hours' : 'We typically respond within 24 hours during business days'}</li>
              <li style="margin-bottom: 8px;">A support specialist will contact you with a solution or next steps</li>
              <li>Premium users receive priority support</li>
            </ul>
          </div>

          <p style="color: #b3b3b3; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            <strong>Your message:</strong><br>
            <em style="color: #888888;">"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"</em>
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://selira.ai/category" style="display: inline-block; background: #d4a574; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">Continue to Selira AI</a>
          </div>

          <div style="border-top: 1px solid #333333; padding-top: 24px; text-align: center;">
            <p style="color: #888888; font-size: 14px; margin: 0;">
              This email was sent from Selira AI Support<br>
              If you didn't submit this contact form, please ignore this email.
            </p>
          </div>
        </div>
      `
    };

    // Send both emails
    await Promise.all([
      sgMail.send(supportMsg),
      sgMail.send(confirmationMsg)
    ]);

    console.log('✅ Contact form emails sent successfully');

    // Store in Airtable if available (optional)
    try {
      const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
      const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

      if (AIRTABLE_BASE_ID && AIRTABLE_TOKEN) {
        const airtableData = {
          fields: {
            Name: name,
            Email: email,
            Subject: subject,
            Priority: priority || 'medium',
            Message: message,
            Status: 'new',
            Submitted_At: timestamp || new Date().toISOString(),
            User_ID: userId || '',
            User_Agent: userAgent || '',
            Source: 'Contact Form'
          }
        };

        const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Support_Tickets`;

        await fetch(airtableUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(airtableData)
        });

        console.log('✅ Contact form stored in Airtable');
      }
    } catch (airtableError) {
      console.warn('⚠️ Failed to store in Airtable:', airtableError.message);
      // Don't fail the whole request if Airtable fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your message! We\'ll get back to you within 24 hours.',
        priority: priorityLabel
      })
    };

  } catch (error) {
    console.error('❌ Contact form error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send message',
        details: 'Please try again or email us directly at support@selira.ai'
      })
    };
  }
};