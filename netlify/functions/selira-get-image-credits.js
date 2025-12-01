const Airtable = require('airtable');

exports.handler = async (event, context) => {
  console.log('💳 Get image credits function called');

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

    // Get user profile
    console.log('👤 Getting user credits', { email, auth0_id });

    let filterFormula = '';
    if (email) {
      filterFormula = `{Email} = '${email}'`;
    } else if (auth0_id) {
      filterFormula = `{Auth0ID} = '${auth0_id}'`;
    }

    const users = await base('Users').select({
      filterByFormula: filterFormula
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
    const purchasedCredits = userRecord.fields.image_credits_remaining || 0;
    const creditsPurchased = userRecord.fields.image_credits_purchased || 0;
    const imagesGenerated = userRecord.fields.images_generated || 0;
    const plan = userRecord.fields.Plan || 'Free';

    // Calculate actual remaining credits
    // Free users get 2 lifetime images (not stored in image_credits_remaining)
    let creditsRemaining = purchasedCredits;
    let isFreeUser = false;

    if (plan === 'Free' && purchasedCredits === 0) {
      // Free user with no purchased credits - check lifetime free images
      const freeImagesRemaining = Math.max(0, 2 - imagesGenerated);
      creditsRemaining = freeImagesRemaining;
      isFreeUser = true;
      console.log('💳 Free user credits:', { imagesGenerated, freeImagesRemaining });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        creditsRemaining,
        creditsPurchased,
        imagesGenerated,
        plan,
        hasActiveSubscription: plan !== 'Free',
        isFreeUser
      })
    };

  } catch (error) {
    console.error('❌ Get image credits error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error getting image credits' })
    };
  }
};
