// Manual webhook test - bypasses Stripe signature verification
const webhook = require('./selira-stripe-webhook.js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get test data from query params or use defaults
    const userEmail = event.queryStringParameters?.email || 'info@narrin.ai';
    const planName = event.queryStringParameters?.plan || 'Basic';

    console.log('🧪 Manual webhook test for:', { userEmail, planName });

    // Create a fake checkout session completed event
    const fakeStripeEvent = {
      id: 'evt_test_manual',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_manual',
          customer: 'cus_manual_test',
          customer_email: userEmail,
          subscription: 'sub_manual_test',
          metadata: {
            user_email: userEmail,
            user_id: 'test-auth0-id',
            plan_name: planName
          }
        }
      }
    };

    // Call the webhook handler directly (bypassing signature verification)
    const handleCheckoutCompleted = async (session) => {
      const Airtable = require('airtable');
      const base = new Airtable({
        apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN
      }).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

      try {
        console.log('🔄 Processing manual checkout for session:', session.id);

        const sessionUserEmail = session.customer_email || session.metadata?.user_email;
        const userId = session.metadata?.user_id;
        const sessionPlanName = session.metadata?.plan_name;

        console.log('📧 Looking for user:', sessionUserEmail);

        // Find user by email first
        const users = await base('Users').select({
          filterByFormula: `{Email} = '${sessionUserEmail}'`
        }).firstPage();

        if (users.length === 0) {
          throw new Error(`User not found: ${sessionUserEmail}`);
        }

        const user = users[0];
        console.log('✅ Found user:', user.fields.Email);

        // Update user plan in Airtable
        const updateData = {
          'Plan': sessionPlanName || 'Basic',
          'stripe_customer_id': session.customer,
          'stripe_subscription_id': session.subscription,
          'plan_start_date': new Date().toISOString().split('T')[0],
          'subscription_status': 'active'
        };

        console.log('🔄 Updating user with:', updateData);

        await base('Users').update(user.id, updateData);

        console.log('✅ User updated successfully');

        return {
          success: true,
          message: 'Manual webhook test completed',
          user: user.fields.Email,
          plan: sessionPlanName
        };

      } catch (error) {
        console.error('❌ Error in manual webhook:', error);
        throw error;
      }
    };

    // Execute the test
    const result = await handleCheckoutCompleted(fakeStripeEvent.data.object);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Manual webhook test completed successfully',
        testData: {
          userEmail,
          planName,
          eventType: fakeStripeEvent.type
        },
        result
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Manual webhook test failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Manual webhook test failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};