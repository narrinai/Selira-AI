// Manual subscription test - updates user directly in Airtable
const fetch = require('node-fetch');

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

async function testSubscriptionUpdate() {
  console.log('🧪 Starting manual subscription test...');

  // Step 1: Find a test user
  console.log('🔍 Finding test user...');

  try {
    const usersResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const usersData = await usersResponse.json();

    if (!usersData.records || usersData.records.length === 0) {
      console.error('❌ No users found in Airtable');
      return;
    }

    const testUser = usersData.records[0];
    console.log('✅ Found test user:', {
      id: testUser.id,
      email: testUser.fields.Email,
      currentPlan: testUser.fields.Plan
    });

    // Step 2: Update user with Basic subscription
    console.log('🔄 Updating user to Basic subscription...');

    const updateData = {
      fields: {
        Plan: 'Basic',
        stripe_customer_id: 'cus_test_' + Date.now(),
        stripe_subscription_id: 'sub_test_' + Date.now(),
        subscription_status: 'active',
        plan_start_date: new Date().toISOString().split('T')[0],
        plan_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
      }
    };

    const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${testUser.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (updateResponse.ok) {
      const updatedUser = await updateResponse.json();
      console.log('✅ User updated successfully!');
      console.log('📧 Email:', updatedUser.fields.Email);
      console.log('📦 New Plan:', updatedUser.fields.Plan);
      console.log('💳 Stripe Customer ID:', updatedUser.fields.stripe_customer_id);
      console.log('🔄 Subscription Status:', updatedUser.fields.subscription_status);

      // Step 3: Test subscription info retrieval
      console.log('\\n🔍 Testing subscription info retrieval...');

      const subInfoResponse = await fetch(`https://selira.ai/.netlify/functions/selira-get-subscription-info?email=${encodeURIComponent(updatedUser.fields.Email)}`);
      const subInfoData = await subInfoResponse.json();

      console.log('📊 Subscription info response:', JSON.stringify(subInfoData, null, 2));

      if (subInfoData.success) {
        console.log('✅ Subscription info retrieved successfully');
        console.log('🎯 The profile page should now show:', subInfoData.subscription.plan);
      } else {
        console.log('❌ Failed to retrieve subscription info');
      }

    } else {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update user:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSubscriptionUpdate();