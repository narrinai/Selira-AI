// Redirect to the correct Selira Stripe webhook
exports.handler = async (event, context) => {
  try {
    console.log('🔄 Forwarding Stripe webhook to selira-stripe-webhook');

    // Forward the request to the correct webhook
    const seliraWebhook = require('./selira-stripe-webhook');
    const result = await seliraWebhook.handler(event, context);

    console.log('✅ Webhook forwarded successfully');
    return result;

  } catch (error) {
    console.error('❌ Error forwarding webhook:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Webhook forwarding failed',
        details: error.message
      })
    };
  }
};