const https = require('https');

exports.handler = async (event, context) => {
  console.log('👤 Get user profile function called');

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

    // Search for user by email
    console.log('🔍 Searching for user profile with email:', email);

    const getUserProfile = () => {
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
              console.log('🔍 User profile search result:', {
                statusCode: res.statusCode,
                recordCount: response.records?.length || 0
              });
              resolve({ statusCode: res.statusCode, data: response });
            } catch (error) {
              console.error('❌ Error parsing Airtable response:', error);
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

    const result = await getUserProfile();

    if (result.statusCode !== 200) {
      console.error('❌ Error fetching user profile:', result.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to fetch user profile' })
      };
    }

    if (!result.data.records || result.data.records.length === 0) {
      console.error('❌ User not found with email:', email);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = result.data.records[0];
    const userProfile = {
      id: userRecord.id,
      email: userRecord.fields.Email,
      display_name: userRecord.fields.display_name,
      name: userRecord.fields.Name,
      plan: userRecord.fields.Plan,
      auth0_id: userRecord.fields.Auth0ID
    };

    console.log('✅ User profile found:', {
      email: userProfile.email,
      display_name: userProfile.display_name,
      hasName: !!userProfile.name
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        profile: userProfile
      })
    };

  } catch (error) {
    console.error('❌ Get user profile error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error fetching user profile' })
    };
  }
};