const Airtable = require('airtable');

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

    // Initialize Airtable
    const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base(AIRTABLE_BASE_ID);

    // Get user profile to check their plan
    console.log('👤 Getting user profile for image limit check', { email, auth0_id });

    // Try Email first
    let filterFormula = '';
    if (email) {
      filterFormula = `{Email} = '${email}'`;
      console.log('🔍 Trying lookup by Email:', email);
    } else if (auth0_id) {
      filterFormula = `{Auth0ID} = '${auth0_id}'`;
      console.log('🔍 Trying lookup by Auth0ID:', auth0_id);
    }

    console.log('🔍 Filter formula:', filterFormula);

    const users = await base('Users').select({
      filterByFormula: filterFormula
    }).firstPage();

    console.log('👥 Users found:', users.length);

    if (users.length === 0) {
      console.error('❌ User not found in Airtable:', { email, auth0_id });
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'User not found'
        })
      };
    }

    const userRecord = users[0];
    const userPlan = userRecord.fields.Plan || 'Basic';
    const userId = userRecord.id;

    console.log('👤 User plan:', userPlan);

    // For Free plan users, check lifetime usage (not hourly)
    if (userPlan === 'Free') {
      // Use images_generated field directly from Users table
      const lifetimeUsage = userRecord.fields.images_generated || 0;

      console.log(`📊 Free plan user lifetime usage from images_generated field: ${lifetimeUsage}/2`);

      // Free plan gets 2 total images (lifetime)
      if (lifetimeUsage >= 2) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'You\'ve used your 2 free images. Upgrade to Basic or Premium for unlimited image generation!',
            plan: userPlan,
            limit: 2,
            usage: lifetimeUsage,
            remaining: 0,
            canGenerate: false,
            upgradeRequired: true
          })
        };
      }

      // Free user can still generate
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          canGenerate: true,
          limit: 2,
          usage: lifetimeUsage,
          remaining: 2 - lifetimeUsage,
          plan: userPlan,
          userId: userId,
          isFreeUser: true
        })
      };
    }

    // For Basic/Premium plans: Check current hour's image usage
    // Use same format as increment function: YYYY-MM-DD-HH
    const now = new Date();
    const currentHour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;

    console.log('🕐 Checking usage for hour:', currentHour);

    // Query ImageUsage table using Airtable SDK
    const usageRecords = await base('ImageUsage').select({
      filterByFormula: `{Hour} = '${currentHour}'`
    }).firstPage();

    console.log('📊 ImageUsage records found for hour:', usageRecords.length);

    let currentUsage = 0;
    let usageRecordId = null;

    // Filter client-side to find record matching this user
    const usageRecord = usageRecords.find(record => {
      const userLinks = record.fields.User || [];
      return userLinks.includes(userId);
    });

    if (usageRecord) {
      currentUsage = usageRecord.fields.Count || 0;
      usageRecordId = usageRecord.id;
      console.log(`✅ Found ImageUsage record for user ${userId}: ${currentUsage} images used`);
    } else {
      console.log(`ℹ️ No ImageUsage record found for user ${userId} in hour ${currentHour}`);
    }

    // Determine hourly limits based on plan
    const limits = {
      'Light': 5,
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