exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Check environment variables
    const stripeKey = process.env.STRIPE_SECRET_KEY_SELIRA ||
                     process.env.STRIPE_SECRET_KEY ||
                     process.env.STRIPE_SELIRA_SECRET;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SELIRA ||
                         process.env.STRIPE_WEBHOOK_SECRET;

    const airtableToken = process.env.AIRTABLE_TOKEN_SELIRA ||
                         process.env.AIRTABLE_API_KEY ||
                         process.env.AIRTABLE_TOKEN;

    const airtableBase = process.env.AIRTABLE_BASE_ID_SELIRA ||
                        process.env.AIRTABLE_BASE_ID;

    const config = {
      stripe_key_present: !!stripeKey,
      stripe_key_length: stripeKey ? stripeKey.length : 0,
      webhook_secret_present: !!webhookSecret,
      webhook_secret_length: webhookSecret ? webhookSecret.length : 0,
      airtable_token_present: !!airtableToken,
      airtable_base_present: !!airtableBase,
      environment_vars_available: Object.keys(process.env).filter(key =>
        key.includes('STRIPE') || key.includes('AIRTABLE')
      )
    };

    console.log('🔍 Stripe/Airtable config check:', config);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: config,
        message: 'Configuration check completed'
      })
    };

  } catch (error) {
    console.error('❌ Config check error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Config check failed',
        details: error.message
      })
    };
  }
};