const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 Testing Airtable connection...');

    // Log available environment variables (without values)
    console.log('📋 Environment variables available:', {
      AIRTABLE_TOKEN_SELIRA: process.env.AIRTABLE_TOKEN_SELIRA ? 'present' : 'missing',
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY ? 'present' : 'missing',
      AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN ? 'present' : 'missing',
      AIRTABLE_BASE_ID_SELIRA: process.env.AIRTABLE_BASE_ID_SELIRA ? 'present' : 'missing',
      AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ? 'present' : 'missing'
    });

    const apiKey = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No Airtable API key found' })
      };
    }

    if (!baseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'No Airtable Base ID found' })
      };
    }

    console.log('🔄 Initializing Airtable with available credentials...');

    const base = new Airtable({ apiKey }).base(baseId);

    console.log('🔍 Testing query to Users table...');

    const users = await base('Users').select({
      maxRecords: 1
    }).firstPage();

    console.log('✅ Airtable connection successful, found', users.length, 'user(s)');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Airtable connection working',
        users_found: users.length,
        credentials_used: {
          api_key_source: process.env.AIRTABLE_TOKEN_SELIRA ? 'AIRTABLE_TOKEN_SELIRA' :
                         process.env.AIRTABLE_API_KEY ? 'AIRTABLE_API_KEY' : 'AIRTABLE_TOKEN',
          base_id_source: process.env.AIRTABLE_BASE_ID_SELIRA ? 'AIRTABLE_BASE_ID_SELIRA' : 'AIRTABLE_BASE_ID'
        }
      })
    };

  } catch (error) {
    console.error('❌ Airtable connection test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Airtable connection failed',
        details: error.message
      })
    };
  }
};