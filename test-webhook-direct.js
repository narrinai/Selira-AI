// Direct webhook test with real user data
const webhook = require('./netlify/functions/selira-stripe-webhook.js');

// Simulate a Stripe webhook event for the user who just upgraded
const testEvent = {
  httpMethod: 'POST',
  headers: {
    'stripe-signature': 'test_signature',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'evt_test_webhook',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session',
        customer: 'cus_test_customer',
        customer_email: 'info@narrin.ai',
        subscription: 'sub_test_subscription',
        metadata: {
          user_email: 'info@narrin.ai',
          user_id: 'test-auth0-id',
          plan_name: 'Basic'
        }
      }
    }
  })
};

// Mock the context
const testContext = {
  callbackWaitsForEmptyEventLoop: false
};

console.log('🧪 Testing webhook with real user email...');
console.log('📧 Email:', 'info@narrin.ai');
console.log('');

// Run the webhook
webhook.handler(testEvent, testContext)
  .then(result => {
    console.log('✅ Webhook response:', result);
  })
  .catch(error => {
    console.error('❌ Webhook error:', error);
  });