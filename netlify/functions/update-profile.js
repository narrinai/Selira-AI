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
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
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

    // Validate required fields
    if (!auth0_id) {
      console.error('❌ Missing auth0_id');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing required field: auth0_id' })
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

    console.log('🔍 Updating profile for Auth0 ID:', auth0_id);
    console.log('📝 New display name:', display_name);

    // Get environment variables - try both Selira and regular credentials
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
      console.error('❌ Missing Airtable credentials', {
        token: !!AIRTABLE_TOKEN,
        baseId: !!AIRTABLE_BASE_ID
      });
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing Airtable configuration' })
      };
    }

    // First, find the user record by Auth0 ID - try both field names
    console.log('🔍 Searching for user with Auth0 ID:', auth0_id);

    const findUserRecord = () => {
      return new Promise((resolve, reject) => {
        // First try Auth0ID field
        const options1 = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=AND({Auth0ID}="${auth0_id}")`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };

        const req1 = https.request(options1, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (res.statusCode === 200 && response.records && response.records.length > 0) {
                console.log('✅ Found user using Auth0ID field');
                resolve({ statusCode: res.statusCode, data: response });
                return;
              }

              // If not found, try AuthID field
              console.log('🔍 User not found with Auth0ID, trying AuthID field');
              const options2 = {
                hostname: 'api.airtable.com',
                port: 443,
                path: `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=AND({AuthID}="${auth0_id}")`,
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              };

              const req2 = https.request(options2, (res2) => {
                let data2 = '';

                res2.on('data', (chunk) => {
                  data2 += chunk;
                });

                res2.on('end', () => {
                  try {
                    const response2 = JSON.parse(data2);
                    if (res2.statusCode === 200 && response2.records && response2.records.length > 0) {
                      console.log('✅ Found user using AuthID field');
                    }
                    resolve({ statusCode: res2.statusCode, data: response2 });
                  } catch (error) {
                    console.error('❌ Error parsing AuthID response:', error);
                    reject(error);
                  }
                });
              });

              req2.on('error', (error) => {
                console.error('❌ AuthID request error:', error);
                reject(error);
              });

              req2.end();

            } catch (error) {
              console.error('❌ Error parsing Auth0ID response:', error);
              reject(error);
            }
          });
        });

        req1.on('error', (error) => {
          console.error('❌ Auth0ID request error:', error);
          reject(error);
        });

        req1.end();
      });
    };

    const findResult = await findUserRecord();

    if (findResult.statusCode !== 200) {
      console.error('❌ Error finding user:', findResult.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to find user record' })
      };
    }

    if (!findResult.data.records || findResult.data.records.length === 0) {
      console.error('❌ User not found with Auth0 ID:', auth0_id);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
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