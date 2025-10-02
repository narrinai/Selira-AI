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
    const { type, subject, text, html, filterByPlan } = JSON.parse(event.body);

    // Validate required fields
    if (!type || !subject) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Type and subject are required'
        })
      };
    }

    // Valid email types
    const validTypes = ['notification', 'marketing'];
    if (!validTypes.includes(type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: `Invalid email type. Must be one of: ${validTypes.join(', ')}`
        })
      };
    }

    console.log('📧 Preparing bulk email send:', { type, subject, filterByPlan });

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

    // Build filter formula
    let filterFormula = '';

    if (type === 'notification') {
      // Only users who have enabled notifications
      filterFormula = '{email_notifications} = TRUE()';
    } else if (type === 'marketing') {
      // Only users who have opted in to marketing
      filterFormula = '{email_marketing} = TRUE()';
    }

    // Add plan filter if specified
    if (filterByPlan) {
      if (filterFormula) {
        filterFormula = `AND(${filterFormula}, {Plan} = "${filterByPlan}")`;
      } else {
        filterFormula = `{Plan} = "${filterByPlan}"`;
      }
    }

    console.log('🔍 Filter formula:', filterFormula);

    // Get all users matching the criteria
    const records = await base('Users')
      .select({
        filterByFormula: filterFormula || 'TRUE()',
        fields: ['Email', 'Display Name', 'email_notifications', 'email_marketing']
      })
      .all();

    console.log(`📊 Found ${records.length} users matching criteria`);

    if (records.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          sent: 0,
          message: 'No users match the criteria'
        })
      };
    }

    // Prepare messages for SendGrid
    const messages = records.map(record => {
      const user = record.fields;
      return {
        to: user.Email,
        from: process.env.SENDGRID_FROM_EMAIL_SELIRA || process.env.SENDGRID_FROM_EMAIL || 'noreply@selira.ai',
        subject: subject,
        text: text || subject,
        html: html || `<p>${text || subject}</p>`,
        customArgs: {
          email_type: type,
          user_id: record.id,
          sent_at: new Date().toISOString()
        },
        // Personalization with user's display name
        dynamicTemplateData: {
          display_name: user['Display Name'] || 'there'
        }
      };
    });

    // Send emails in batches (SendGrid recommends max 1000 per request)
    const batchSize = 1000;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      try {
        await sgMail.send(batch);
        totalSent += batch.length;
        console.log(`✅ Sent batch ${i / batchSize + 1}: ${batch.length} emails`);
      } catch (error) {
        totalFailed += batch.length;
        console.error(`❌ Failed to send batch ${i / batchSize + 1}:`, error);
      }
    }

    console.log(`📊 Bulk send complete: ${totalSent} sent, ${totalFailed} failed`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        total: records.length
      })
    };

  } catch (error) {
    console.error('❌ Error in bulk send:', error);

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
