// Get user's image generation permissions and plan info
// Used by feed page to check user's access level

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  console.log('🔐 Image permissions check called');

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
    const { email, supabase_id, auth0_id } = JSON.parse(event.body || '{}');

    if (!email && !supabase_id && !auth0_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Email, Supabase ID, or Auth0 ID required' })
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

    // Get user profile
    console.log('👤 Getting user permissions', { email, supabase_id, auth0_id });

    let filterFormula = '';
    if (email) {
      filterFormula = `{Email} = '${email}'`;
    } else if (supabase_id) {
      filterFormula = `{Supabase_ID} = '${supabase_id}'`;
    } else if (auth0_id) {
      filterFormula = `{Auth0ID} = '${auth0_id}'`;
    }

    const users = await base('Users').select({
      filterByFormula: filterFormula,
      maxRecords: 1
    }).firstPage();

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = users[0];
    const fields = userRecord.fields;

    const plan = fields.Plan || fields.plan || 'free';
    const imageCreditsRemaining = fields.image_credits_remaining || 0;
    const imageCreditsUsed = fields.images_generated || 0;
    const imageCreditsTotal = fields.image_credits_purchased || 0;

    // Check if user has active subscription
    const hasActiveSubscription = plan !== 'free' && plan !== 'Free';

    // Calculate permissions
    const canGenerateImages = hasActiveSubscription || imageCreditsRemaining > 0;
    const hasUnlimitedGeneration = hasActiveSubscription;

    console.log('✅ User permissions:', {
      plan,
      canGenerateImages,
      hasUnlimitedGeneration,
      imageCreditsRemaining
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        user_id: userRecord.id,
        plan,
        imageCreditsRemaining,
        imageCreditsUsed,
        imageCreditsTotal,
        canGenerateImages,
        hasUnlimitedGeneration,
        hasActiveSubscription
      })
    };

  } catch (error) {
    console.error('❌ Image permissions error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error checking permissions',
        details: error.message
      })
    };
  }
};
