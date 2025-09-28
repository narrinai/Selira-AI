const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 Testing Airtable connection');

    // Check environment variables
    const airtableKey = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const airtableBase = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    console.log('🔍 Environment check:', {
      hasAirtableKey: !!airtableKey,
      hasAirtableBase: !!airtableBase,
      keyLength: airtableKey ? airtableKey.length : 0,
      baseLength: airtableBase ? airtableBase.length : 0,
      keyPrefix: airtableKey ? airtableKey.substring(0, 8) + '...' : 'none',
      basePrefix: airtableBase ? airtableBase.substring(0, 8) + '...' : 'none',
      envVarNames: {
        hasSeliraToken: !!process.env.AIRTABLE_TOKEN_SELIRA,
        hasGeneralToken: !!process.env.AIRTABLE_API_KEY,
        hasToken: !!process.env.AIRTABLE_TOKEN,
        hasSeliraBase: !!process.env.AIRTABLE_BASE_ID_SELIRA,
        hasGeneralBase: !!process.env.AIRTABLE_BASE_ID
      }
    });

    if (!airtableKey || !airtableBase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing Airtable configuration',
          hasKey: !!airtableKey,
          hasBase: !!airtableBase
        })
      };
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: airtableKey }).base(airtableBase);

    const { userEmail } = JSON.parse(event.body || '{}');

    if (!userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userEmail required' })
      };
    }

    console.log('🔍 Looking up user:', userEmail);

    // Try to find user
    const users = await base('Users').select({
      filterByFormula: `{Email} = '${userEmail}'`,
      maxRecords: 1
    }).firstPage();

    console.log('🔍 Search result:', {
      foundUsers: users.length,
      userEmail: userEmail
    });

    if (users.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          found: false,
          message: 'User not found in Airtable',
          searchEmail: userEmail
        })
      };
    }

    const user = users[0];
    const userData = user.fields;

    console.log('✅ User found:', {
      email: userData.Email,
      plan: userData.Plan,
      fieldCount: Object.keys(userData).length
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        found: true,
        user: {
          email: userData.Email,
          plan: userData.Plan,
          fieldNames: Object.keys(userData),
          stripeFields: Object.keys(userData).filter(key =>
            key.toLowerCase().includes('stripe') ||
            key.toLowerCase().includes('subscription')
          )
        }
      })
    };

  } catch (error) {
    console.error('❌ Airtable test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
};