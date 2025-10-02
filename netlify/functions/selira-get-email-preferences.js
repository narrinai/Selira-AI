const Airtable = require('airtable');

exports.handler = async (event, context) => {
  try {
    const { email } = event.queryStringParameters || {};

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Email is required'
        })
      };
    }

    console.log('📧 Getting email preferences for:', email);

    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

    // Find user by email
    const records = await base('Users')
      .select({
        filterByFormula: `{Email} = "${email}"`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          error: 'User not found'
        })
      };
    }

    const user = records[0].fields;

    // Return email preferences (default to true if not set)
    const preferences = {
      notifications: user.email_notifications !== false,
      marketing: user.email_marketing === true
    };

    console.log('✅ Email preferences retrieved:', preferences);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        preferences
      })
    };

  } catch (error) {
    console.error('❌ Error getting email preferences:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
