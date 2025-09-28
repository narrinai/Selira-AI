// Redirect to the correct Selira Stripe webhook
exports.handler = async (event, context) => {
  // Forward the request to the correct webhook
  const seliraWebhook = require('./selira-stripe-webhook');
  return await seliraWebhook.handler(event, context);
};