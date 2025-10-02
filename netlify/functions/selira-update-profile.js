const https = require('https');

exports.handler = async (event, context) => {
  console.log('🔧 Profile update function called');

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  // Handle preflight OPTIONS requests
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

  try {
    console.log('📥 Received request:', {
      method: event.httpMethod,
      body: event.body,
      headers: event.headers
    });

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
      console.log('📥 Parsed request data:', requestData);
    } catch (parseError) {
      console.error('❌ Invalid JSON in request body:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { auth0_id, display_name } = requestData;

    // Validate required fields - auth0_id is actually the email in this context
    if (!auth0_id) {
      console.error('❌ Missing auth0_id (email)');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required field: auth0_id (email)' })
      };
    }

    if (!display_name) {
      console.error('❌ Missing display_name');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required field: display_name' })
      };
    }

    console.log('🔍 Updating profile for user email:', auth0_id);
    console.log('📝 New display name:', display_name);

    // Get environment variables - use only Selira credentials
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      console.error('❌ Missing Airtable credentials');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing Airtable configuration' })
      };
    }

    // Find the user record by Email OR Auth0ID
    console.log('🔍 Searching for user with identifier:', auth0_id);

    const findUserRecord = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=OR({Email}="${auth0_id}",{Auth0ID}="${auth0_id}")`,
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
              console.log('🔍 Email search result:', {
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

    const findResult = await findUserRecord();

    if (findResult.statusCode !== 200) {
      console.error('❌ Error finding user:', {
        statusCode: findResult.statusCode,
        data: findResult.data
      });
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Failed to find user record',
          details: `HTTP ${findResult.statusCode}`,
          airtableError: findResult.data
        })
      };
    }

    if (!findResult.data.records || findResult.data.records.length === 0) {
      console.error('❌ User not found with email:', auth0_id, {
        searchResult: findResult.data,
        recordCount: findResult.data.records?.length || 0
      });
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'User not found',
          searchedEmail: auth0_id,
          recordCount: findResult.data.records?.length || 0
        })
      };
    }

    const userRecord = findResult.data.records[0];
    const recordId = userRecord.id;

    console.log('✅ Found user record:', recordId);

    // Update the user record with the new display name
    const updateUserRecord = () => {
      return new Promise((resolve, reject) => {
        const updateData = JSON.stringify({
          fields: {
            display_name: display_name
          }
        });

        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users/${recordId}`,
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateData)
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
              console.error('❌ Error parsing update response:', error);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Update request error:', error);
          reject(error);
        });

        req.write(updateData);
        req.end();
      });
    };

    const updateResult = await updateUserRecord();

    if (updateResult.statusCode !== 200) {
      console.error('❌ Error updating user:', updateResult.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to update user record' })
      };
    }

    console.log('✅ Successfully updated display name for user:', auth0_id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Display name updated successfully',
        display_name: display_name
      })
    };

  } catch (error) {
    console.error('❌ Profile update error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error updating profile' })
    };
  }
};