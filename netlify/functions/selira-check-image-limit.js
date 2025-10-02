const https = require('https');

exports.handler = async (event, context) => {
  console.log('🖼️ Check image limit function called');

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

    if (!email && !auth0_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Email or Auth0 ID required' })
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

    // Get user profile to check their plan
    console.log('👤 Getting user profile for image limit check');
    const userFilter = email ? `{Email}="${email}"` : `{Auth0ID}="${auth0_id}"`;

    const getUserProfile = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=AND(${userFilter})`,
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

    const userResult = await getUserProfile();

    if (userResult.statusCode !== 200 || !userResult.data.records || userResult.data.records.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = userResult.data.records[0];
    const userPlan = userRecord.fields.Plan || 'Basic';
    const userId = userRecord.id;

    console.log('👤 User plan:', userPlan);

    // Block Free plan users from generating images
    if (userPlan === 'Free') {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Image generation is not available on the Free plan. Upgrade to Basic or Premium to generate images!',
          plan: userPlan,
          limit: 0,
          usage: 0,
          canGenerate: false,
          upgradeRequired: true
        })
      };
    }

    // Check current hour's image usage
    // Use same format as increment function: YYYY-MM-DD-HH
    const now = new Date();
    const currentHour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

    console.log('🕐 Checking usage for hour:', currentHour);

    const getImageUsage = () => {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.airtable.com',
          port: 443,
          path: `/v0/${AIRTABLE_BASE_ID}/ImageUsage?filterByFormula=AND(RECORD_ID()=ARRAYJOIN(User),{Hour}="${currentHour}")`,
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

    const usageResult = await getImageUsage();

    let currentUsage = 0;
    let usageRecordId = null;

    if (usageResult.statusCode === 200 && usageResult.data.records && usageResult.data.records.length > 0) {
      const usageRecord = usageResult.data.records[0];
      currentUsage = usageRecord.fields.Count || 0;
      usageRecordId = usageRecord.id;
    }

    // Determine hourly limits based on plan
    const limits = {
      'Basic': 10,
      'Premium': 20,
      'Pro': 20 // Treating Pro same as Premium for images
    };

    const hourlyLimit = limits[userPlan] || limits['Basic'];

    console.log(`📊 Current usage: ${currentUsage}/${hourlyLimit} for ${userPlan} plan`);

    // Check if user has exceeded their limit
    if (currentUsage >= hourlyLimit) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: `You've reached your ${userPlan} plan limit of ${hourlyLimit} images per hour. Please try again in the next hour.`,
          limit: hourlyLimit,
          usage: currentUsage,
          plan: userPlan,
          canGenerate: false
        })
      };
    }

    // User can generate image - return current status
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        canGenerate: true,
        limit: hourlyLimit,
        usage: currentUsage,
        remaining: hourlyLimit - currentUsage,
        plan: userPlan,
        userId: userId,
        usageRecordId: usageRecordId,
        currentHour: currentHour
      })
    };

  } catch (error) {
    console.error('❌ Check image limit error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error checking image limit' })
    };
  }
};