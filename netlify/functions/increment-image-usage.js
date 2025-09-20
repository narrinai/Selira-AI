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