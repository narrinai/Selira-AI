const Airtable = require('airtable');

exports.handler = async (event, context) => {
  console.log('🗑️ Delete account request function called');

  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    const { email, auth0_id } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing Airtable configuration' })
      };
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE_ID);

    // Get user record
    console.log('👤 Looking up user:', email);
    let filterFormula = '';
    if (email) {
      filterFormula = `{Email} = '${email}'`;
    } else if (auth0_id) {
      filterFormula = `OR({SupabaseID} = '${auth0_id}', {Auth0ID} = '${auth0_id}')`;
    }

    const users = await base('Users').select({
      filterByFormula: filterFormula
    }).firstPage();

    if (users.length === 0) {
      console.warn('⚠️ User not found:', email);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = users[0];
    const userId = userRecord.id;
    const userName = userRecord.fields.Name || email;
    const userPlan = userRecord.fields.Plan || 'Free';

    console.log('📝 Creating deletion request in Support_Messages table');

    // Create support message for deletion request
    await base('Support_Messages').create([
      {
        fields: {
          Subject: 'Account Deletion Request',
          Message: `User ${email} has requested account deletion.\n\nUser Details:\n- Name: ${userName}\n- Email: ${email}\n- Plan: ${userPlan}\n- Airtable Record ID: ${userId}\n- Auth0 ID: ${auth0_id || 'N/A'}\n- Request Date: ${new Date().toISOString()}\n\nPlease process this request within 48 hours.`,
          Status: 'Open'
        }
      }
    ]);

    console.log('✅ Support message created successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Account deletion request submitted successfully'
      })
    };

  } catch (error) {
    console.error('❌ Delete account request error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error processing deletion request',
        details: error.message
      })
    };
  }
};
