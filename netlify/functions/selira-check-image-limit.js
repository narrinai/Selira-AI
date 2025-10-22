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
    const { email, supabase_id, airtable_record_id } = JSON.parse(event.body || '{}');

    if (!email && !supabase_id && !airtable_record_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Email, Supabase ID, or Airtable record ID required' })
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
    console.log('👤 Getting user profile for image limit check', { email, supabase_id, airtable_record_id });

    let userRecord;
    let userId;

    // FAST PATH: If Airtable record ID provided, fetch directly (no formula query needed)
    if (airtable_record_id && airtable_record_id.startsWith('rec')) {
      console.log('⚡ Fast path: Using Airtable record ID directly:', airtable_record_id);
      try {
        userRecord = await base('Users').find(airtable_record_id);
        userId = userRecord.id;
        console.log('✅ User found via record ID:', userId);
      } catch (err) {
        console.error('❌ User not found by record ID:', airtable_record_id, err.message);
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
    } else {
      // SLOW PATH: Lookup by SupabaseID or Email (requires filterByFormula query)
      console.log('🐌 Slow path: Looking up user by SupabaseID/Email');

      let filterFormula = '';
      if (supabase_id) {
        filterFormula = `{SupabaseID} = '${supabase_id}'`;
        console.log('🔍 Trying lookup by SupabaseID (primary):', supabase_id);
      } else if (email) {
        filterFormula = `{Email} = '${email}'`;
        console.log('🔍 Trying lookup by Email (fallback):', email);
      }

      console.log('🔍 Filter formula:', filterFormula);

      const users = await base('Users').select({
        filterByFormula: filterFormula,
        maxRecords: 1,
        fields: ['Plan', 'images_generated', 'image_credits_remaining']
      }).firstPage();

      console.log('👥 Users found:', users.length);

      if (users.length === 0) {
        console.error('❌ User not found in Airtable:', { email, supabase_id });
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

      userRecord = users[0];
      userId = userRecord.id;
    }

    const userPlan = userRecord.fields.Plan || 'Free';
    const imageCreditsRemaining = userRecord.fields.image_credits_remaining || 0;

    console.log('👤 User plan:', userPlan);
    console.log('💳 Image credits remaining:', imageCreditsRemaining);

    // For Free plan users, check lifetime usage OR credits (FAST PATH - no ImageUsage lookup needed)
    if (userPlan === 'Free') {
      // Check if they have purchased credits first
      if (imageCreditsRemaining > 0) {
        console.log(`💳 Free user has ${imageCreditsRemaining} purchased credits`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            canGenerate: true,
            plan: userPlan,
            userId: userId,
            imageCreditsRemaining: imageCreditsRemaining,
            remaining: imageCreditsRemaining,
            limit: imageCreditsRemaining,
            usingCredits: true
          })
        };
      }

      // No credits, check lifetime usage (1 free image)
      const lifetimeUsage = userRecord.fields.images_generated || 0;

      console.log(`📊 Free plan user lifetime usage from images_generated field: ${lifetimeUsage}/1`);

      // Free plan gets 1 total image (lifetime)
      if (lifetimeUsage >= 1) {
        return {
          statusCode: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'You\'ve used your 1 free image. Upgrade to Basic or Premium for unlimited image generation!',
            plan: userPlan,
            limit: 1,
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
          limit: 1,
          usage: lifetimeUsage,
          remaining: 1 - lifetimeUsage,
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

    // Query ImageUsage table using Airtable SDK (optimized)
    const usageRecords = await base('ImageUsage').select({
      filterByFormula: `{Hour} = '${currentHour}'`,
      maxRecords: 100, // Limit to prevent slow queries
      fields: ['User', 'Count', 'Hour'] // Only fetch needed fields
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
      // Check if they have purchased credits to continue
      if (imageCreditsRemaining > 0) {
        console.log(`💳 ${userPlan} user hit hourly limit but has ${imageCreditsRemaining} purchased credits available`);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            canGenerate: true,
            plan: userPlan,
            userId: userId,
            imageCreditsRemaining: imageCreditsRemaining,
            remaining: imageCreditsRemaining,
            limit: hourlyLimit,
            hourlyLimitReached: true,
            usingCredits: true
          })
        };
      }

      // No credits available - return hourly limit error
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
          canGenerate: false,
          imageCreditsRemaining: imageCreditsRemaining
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