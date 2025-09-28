// Redirect to the correct Selira Stripe webhook
exports.handler = async (event, context) => {
  // Forward the request to the correct webhook
  const sirilaWebhook = require('./selira-stripe-webhook');
  return await sirilaWebhook.handler(event, context);
};