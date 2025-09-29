// Test script to simulate Stripe webhook events without payment
const fetch = require('node-fetch');

// Simulate a checkout.session.completed event
async function testWebhook() {
  const testEmail = 'test@example.com'; // Use a real user email from your Airtable
  const testUserId = 'test-auth0-id';

  // Simulate the webhook payload that Stripe would send
  const webhookData = {
    id: 'cs_test_123',
    customer: 'cus_test_123',
    customer_email: testEmail,
    subscription: 'sub_test_123',
    metadata: {
      user_id: testUserId,
      user_email: testEmail,
      plan_name: 'Basic'
    }
  };

  try {
    console.log('🧪 Testing webhook with data:', webhookData);

    // You can call the webhook function directly here
    // Or make an HTTP request to test the endpoint

    console.log('✅ Test completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testWebhook();