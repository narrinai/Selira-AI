const https = require('https');

exports.handler = async (event, context) => {
  console.log('📈 Increment image usage function called');

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
    const { userId, usageRecordId, currentHour } = JSON.parse(event.body || '{}');

    if (!userId || !currentHour) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'userId and currentHour required' })
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

    const updateOrCreateUsage = (method, recordId = null, count = 1) => {
      return new Promise((resolve, reject) => {
        const data = JSON.stringify({
          records: [{
            ...(recordId && { id: recordId }),
            fields: {
              UserID: userId,
              Hour: currentHour,
              Count: count
            }
          }]
        });

        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/ImageUsage`,
          method: method,
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };

        const req = https.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            try {
              const response = JSON.parse(responseData);
              resolve({ statusCode: res.statusCode, data: response });
            } catch (error) {
              reject(error);
            }
          });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
      });
    };

    let result;

    if (usageRecordId) {
      // Update existing record - first get current count
      const getCurrentCount = () => {
        return new Promise((resolve, reject) => {
          const options = {
            hostname: 'api.airtable.com',
            port: 443,
            path: `/v0/${AIRTABLE_BASE_ID}/ImageUsage/${usageRecordId}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              try {
                const response = JSON.parse(data);
                resolve({ statusCode: res.statusCode, data: response });
              } catch (error) {
                reject(error);
              }
            });
          });

          req.on('error', reject);
          req.end();
        });
      };

      const currentRecord = await getCurrentCount();
      const currentCount = currentRecord.data.fields?.Count || 0;
      const newCount = currentCount + 1;

      console.log(`📈 Updating existing record: ${currentCount} → ${newCount}`);
      result = await updateOrCreateUsage('PATCH', usageRecordId, newCount);
    } else {
      // Create new record
      console.log('📈 Creating new usage record with count: 1');
      result = await updateOrCreateUsage('POST', null, 1);
    }

    if (result.statusCode !== 200) {
      console.error('❌ Error updating image usage:', result.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to update image usage' })
      };
    }

    console.log('✅ Image usage incremented successfully');

    // Also update the total images_generated count in the Users table
    try {
      console.log('📊 Updating total images_generated in Users table for userId:', userId);

      // First, find the user by Auth0ID to get their Airtable record ID
      const getUserRecord = () => {
        return new Promise((resolve, reject) => {
          // userId might be Auth0ID (auth0|xxx) or Airtable record ID (recXXX)
          // Try both approaches
          const isAirtableRecordId = userId.startsWith('rec');
          const path = isAirtableRecordId
            ? `/v0/${AIRTABLE_BASE_ID}/Users/${userId}`
            : `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}="${userId}"&maxRecords=1`;

          const options = {
            hostname: 'api.airtable.com',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };

          console.log(`🔍 Looking up user with ${isAirtableRecordId ? 'record ID' : 'Auth0ID'}:`, userId);

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
              try {
                const response = JSON.parse(data);
                resolve({ statusCode: res.statusCode, data: response, isAirtableRecordId });
              } catch (error) {
                reject(error);
              }
            });
          });

          req.on('error', reject);
          req.end();
        });
      };

      const userLookup = await getUserRecord();
      if (userLookup.statusCode === 200) {
        // Extract user record based on lookup method
        const userRecord = userLookup.isAirtableRecordId
          ? userLookup.data
          : userLookup.data.records?.[0];

        if (!userRecord) {
          console.warn('⚠️ User not found in Users table:', userId);
          return; // Exit early if user not found
        }

        const userRecordId = userRecord.id;
        const currentImagesGenerated = userRecord.fields?.images_generated || 0;
        const newImagesGenerated = currentImagesGenerated + 1;

        console.log(`📊 Found user record ${userRecordId}, updating: ${currentImagesGenerated} → ${newImagesGenerated}`);

        // Update the Users table with the new total
        const updateUserRecord = () => {
          return new Promise((resolve, reject) => {
            const data = JSON.stringify({
              fields: {
                images_generated: newImagesGenerated
              }
            });

            const options = {
              hostname: 'api.airtable.com',
              port: 443,
              path: `/v0/${AIRTABLE_BASE_ID}/Users/${userRecordId}`,
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
              }
            };

            const req = https.request(options, (res) => {
              let responseData = '';
              res.on('data', (chunk) => { responseData += chunk; });
              res.on('end', () => {
                try {
                  const response = JSON.parse(responseData);
                  resolve({ statusCode: res.statusCode, data: response });
                } catch (error) {
                  reject(error);
                }
              });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
          });
        };

        const userUpdateResult = await updateUserRecord();
        if (userUpdateResult.statusCode === 200) {
          console.log(`✅ Successfully updated Users table images_generated to: ${newImagesGenerated}`);
        } else {
          console.warn('⚠️ Failed to update Users table images_generated:', userUpdateResult.data);
        }
      } else {
        console.warn('⚠️ Could not fetch user record to update images_generated:', userRecord.data);
      }
    } catch (userUpdateError) {
      console.warn('⚠️ Error updating Users table images_generated:', userUpdateError.message);
      // Don't fail the whole request if this fails
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        newCount: result.data.records[0].fields.Count
      })
    };

  } catch (error) {
    console.error('❌ Increment image usage error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error incrementing image usage' })
    };
  }
};