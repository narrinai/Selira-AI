const sgMail = require('@sendgrid/mail');
const Airtable = require('airtable');

sgMail.setApiKey(process.env.SENDGRID_API_KEY_SELIRA || process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, type, subject, text, html } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !type || !subject) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Email, type, and subject are required'
        })
      };
    }

    // Valid email types
    const validTypes = ['notification', 'marketing', 'transactional'];
    if (!validTypes.includes(type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `Invalid email type. Must be one of: ${validTypes.join(', ')}`
        })
      };
    }

    console.log('📧 Preparing to send email:', { email, type, subject });

    // Check user preferences in Airtable (skip for transactional emails)
    if (type !== 'transactional') {
      const base = new Airtable({
        apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
      }).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

      const records = await base('Users')
        .select({
          filterByFormula: `{Email} = "${email}"`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length > 0) {
        const user = records[0].fields;

        // Check if user has opted out of this type of email
        if (type === 'notification' && user.email_notifications === false) {
          console.log('⚠️ User has disabled notification emails');
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: false,
              skipped: true,
              reason: 'User has disabled notification emails'
            })
          };
        }

        if (type === 'marketing' && user.email_marketing !== true) {
          console.log('⚠️ User has not opted in to marketing emails');
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: false,
              skipped: true,
              reason: 'User has not opted in to marketing emails'
            })
          };
        }
      }
    }

    // Prepare email message
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL_SELIRA || process.env.SENDGRID_FROM_EMAIL || 'noreply@selira.ai',
      subject: subject,
      text: text || subject,
      html: html || `<p>${text || subject}</p>`
    };

    // Add custom args for tracking
    msg.customArgs = {
      email_type: type,
      sent_at: new Date().toISOString()
    };

    // Send email via SendGrid
    await sgMail.send(msg);

    console.log('✅ Email sent successfully via SendGrid');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        type
      })
    };

  } catch (error) {
    console.error('❌ Error sending email:', error);

    // Handle SendGrid specific errors
    if (error.response) {
      console.error('SendGrid error response:', error.response.body);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
