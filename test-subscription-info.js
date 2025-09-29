// Test subscription info retrieval
const fetch = require('node-fetch');

async function testSubscriptionInfo() {
  // Test with a known email (gebruik een echte email uit je systeem)
  const testEmail = 'test@example.com'; // Vervang met echte email

  try {
    console.log('🔍 Testing subscription info retrieval for:', testEmail);

    const response = await fetch(`https://selira.ai/.netlify/functions/selira-get-subscription-info?email=${encodeURIComponent(testEmail)}`);
    const data = await response.json();

    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Subscription info retrieved successfully');
      console.log('📦 Current plan:', data.subscription.plan);
      console.log('📅 Subscription status:', data.subscription.subscription_status);
    } else {
      console.log('❌ Failed to retrieve subscription info');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testSubscriptionInfo();