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
    const { userId } = JSON.parse(event.body || '{}');

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'userId required' })
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

    console.log('📊 Updating images_generated in Users table for userId:', userId);

    // Find the user by Auth0ID to get their Airtable record ID
    const getUserRecord = () => {
      return new Promise((resolve, reject) => {
        // userId might be Auth0ID (auth0|xxx) or Airtable record ID (recXXX)
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

        console.log(`🔍 Looking up user with ${isAirtableRecordId ? 'record ID' : 'Auth0ID'}:`, userId.substring(0, 20) + '...');

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

    if (userLookup.statusCode !== 200) {
      console.error('❌ Failed to lookup user:', userLookup.statusCode, userLookup.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to lookup user' })
      };
    }

    // Extract user record based on lookup method
    const userRecord = userLookup.isAirtableRecordId
      ? userLookup.data
      : userLookup.data.records?.[0];

    if (!userRecord) {
      console.warn('⚠️ User not found in Users table:', userId);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecordId = userRecord.id;
    const currentImagesGenerated = userRecord.fields?.images_generated || 0;
    const newImagesGenerated = currentImagesGenerated + 1;
    const currentCreditsRemaining = userRecord.fields?.image_credits_remaining || 0;
    const userPlan = userRecord.fields?.Plan || 'Free';

    console.log(`📊 Found user record ${userRecordId}, updating: ${currentImagesGenerated} → ${newImagesGenerated}`);
    console.log(`💳 User plan: ${userPlan}, Credits remaining: ${currentCreditsRemaining}`);

    // Get current hour in format YYYY-MM-DD-HH
    const now = new Date();
    const currentHour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

    console.log(`🕐 Current hour: ${currentHour}`);

    // Check if ImageUsage record exists for this user + hour
    const findImageUsage = () => {
      return new Promise((resolve, reject) => {
        // Search for User link and Hour match
        const filterFormula = `AND(SEARCH("${userRecordId}", ARRAYJOIN(User)), {Hour}="${currentHour}")`;
        const path = `/v0/${AIRTABLE_BASE_ID}/ImageUsage?filterByFormula=${encodeURIComponent(filterFormula)}`;

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

        console.log('🔍 Looking up ImageUsage record for user:', userRecordId, 'hour:', currentHour);
        console.log('🔍 Filter formula:', filterFormula);

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

    const imageUsageLookup = await findImageUsage();

    let imageUsageUpdateResult;

    if (imageUsageLookup.data.records && imageUsageLookup.data.records.length > 0) {
      // Record exists - increment Count
      const existingRecord = imageUsageLookup.data.records[0];
      const currentCount = existingRecord.fields.Count || 0;
      const newCount = currentCount + 1;

      console.log(`📊 ImageUsage record exists, incrementing: ${currentCount} → ${newCount}`);

      const updateImageUsage = () => {
        return new Promise((resolve, reject) => {
          const data = JSON.stringify({
            fields: {
              Count: newCount
            }
          });

          const options = {
            hostname: 'api.airtable.com',
            port: 443,
            path: `/v0/${AIRTABLE_BASE_ID}/ImageUsage/${existingRecord.id}`,
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

      imageUsageUpdateResult = await updateImageUsage();
    } else {
      // Record doesn't exist - create new one
      console.log(`➕ Creating new ImageUsage record for user ${userRecordId}, hour ${currentHour}`);

      const createImageUsage = () => {
        return new Promise((resolve, reject) => {
          const data = JSON.stringify({
            fields: {
              User: [userRecordId],
              Hour: currentHour,
              Count: 1
            }
          });

          const options = {
            hostname: 'api.airtable.com',
            port: 443,
            path: `/v0/${AIRTABLE_BASE_ID}/ImageUsage`,
            method: 'POST',
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

      imageUsageUpdateResult = await createImageUsage();
    }

    if (imageUsageUpdateResult.statusCode !== 200 && imageUsageUpdateResult.statusCode !== 201) {
      console.error('❌ Failed to update ImageUsage table:', imageUsageUpdateResult.data);
      // Continue anyway - we still want to update lifetime counter
    } else {
      console.log(`✅ Successfully updated ImageUsage table`);
    }

    // Update the Users table with the new lifetime total
    // If user has credits, decrement them. Otherwise just increment images_generated
    const updateUserRecord = () => {
      return new Promise((resolve, reject) => {
        const updateFields = {
          images_generated: newImagesGenerated
        };

        // Decrement credits if user has them (regardless of plan)
        if (currentCreditsRemaining > 0) {
          updateFields.image_credits_remaining = currentCreditsRemaining - 1;
          console.log(`💳 Decrementing credits: ${currentCreditsRemaining} → ${currentCreditsRemaining - 1}`);
        }

        const data = JSON.stringify({ fields: updateFields });

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

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          newCount: newImagesGenerated,
          userId: userRecordId
        })
      };
    } else {
      console.error('❌ Failed to update Users table images_generated:', userUpdateResult.data);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Failed to update image usage' })
      };
    }

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
