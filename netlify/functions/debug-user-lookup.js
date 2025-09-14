const https = require('https');

exports.handler = async (event, context) => {
  console.log('🔍 Debug user lookup function called');

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
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Email required' })
      };
    }

    // Get environment variables
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    console.log('🔍 Environment check:', {
      hasSeliraToken: !!process.env.AIRTABLE_TOKEN_SELIRA,
      hasToken: !!process.env.AIRTABLE_TOKEN,
      hasApiKey: !!process.env.AIRTABLE_API_KEY,
      hasSeliraBaseId: !!process.env.AIRTABLE_BASE_ID_SELIRA,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID,
      finalToken: !!AIRTABLE_TOKEN,
      finalBaseId: !!AIRTABLE_BASE_ID
    });

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

    // Search for user by email first
    console.log('🔍 Searching for user with email:', email);

    const searchByEmail = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=AND({Email}="${email}")`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: response, searchType: 'email' });
            } catch (error) {
              console.error('❌ Error parsing response:', error);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Request error:', error);
          reject(error);
        });

        req.end();
      });
    };

    const emailResult = await searchByEmail();
    console.log('📧 Email search result:', {
      statusCode: emailResult.statusCode,
      recordCount: emailResult.data.records?.length || 0,
      records: emailResult.data.records?.map(r => ({
        id: r.id,
        fields: r.fields
      }))
    });

    // Also get all users to see the structure
    const getAllUsers = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users?maxRecords=5`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: response });
            } catch (error) {
              console.error('❌ Error parsing all users response:', error);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ All users request error:', error);
          reject(error);
        });

        req.end();
      });
    };

    const allUsersResult = await getAllUsers();
    console.log('👥 All users sample:', {
      statusCode: allUsersResult.statusCode,
      recordCount: allUsersResult.data.records?.length || 0,
      sampleFields: allUsersResult.data.records?.map(r => Object.keys(r.fields || {}))
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        environment: {
          hasSeliraToken: !!process.env.AIRTABLE_TOKEN_SELIRA,
          hasToken: !!process.env.AIRTABLE_TOKEN,
          hasApiKey: !!process.env.AIRTABLE_API_KEY,
          hasSeliraBaseId: !!process.env.AIRTABLE_BASE_ID_SELIRA,
          hasBaseId: !!process.env.AIRTABLE_BASE_ID,
          finalToken: !!AIRTABLE_TOKEN,
          finalBaseId: !!AIRTABLE_BASE_ID
        },
        emailSearch: {
          found: emailResult.data.records?.length > 0,
          count: emailResult.data.records?.length || 0,
          records: emailResult.data.records?.map(r => ({
            id: r.id,
            fields: r.fields
          }))
        },
        allUsersFields: allUsersResult.data.records?.map(r => Object.keys(r.fields || {})) || []
      })
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Debug function error', details: error.message })
    };
  }
};