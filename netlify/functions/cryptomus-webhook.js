const crypto = require('crypto');

/**
 * Cryptomus Webhook Handler
 * Receives payment status updates from Cryptomus
 * Verifies signature and updates user subscription/credits in Airtable
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔔 Cryptomus webhook received');

    // Optional: Verify IP whitelist (Cryptomus webhooks come from 91.227.144.54)
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'];
    console.log('📍 Request from IP:', clientIP);

    // Note: IP check is optional since we verify signature
    // Uncomment below to enforce IP whitelist:
    // if (clientIP !== '91.227.144.54') {
    //   console.error('❌ Invalid IP address:', clientIP);
    //   return { statusCode: 403, headers, body: JSON.stringify({ error: 'Forbidden' }) };
    // }

    // Parse webhook data
    const webhookData = JSON.parse(event.body || '{}');
    console.log('📦 Webhook data:', JSON.stringify(webhookData, null, 2));

    // Verify webhook signature
    const receivedSign = event.headers['sign'] || event.headers['Sign'];
    const apiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    if (!apiKey) {
      console.error('❌ Missing Cryptomus API key');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Configuration error' })
      };
    }

    // Verify signature
    const isValid = verifySignature(webhookData, receivedSign, apiKey);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    console.log('✅ Webhook signature verified');

    // Extract payment info
    const {
      uuid,
      order_id,
      amount,
      currency,
      status,
      payment_status,
      additional_data
    } = webhookData;

    console.log('📊 Payment status:', {
      uuid,
      order_id,
      status,
      payment_status,
      amount,
      currency
    });

    // Parse additional data
    let userData = {};
    try {
      userData = JSON.parse(additional_data || '{}');
    } catch (e) {
      console.error('⚠️ Failed to parse additional_data:', e);
    }

    // Handle payment based on status
    // Cryptomus statuses: paid, paid_over, wrong_amount, process, confirm_check, wrong_amount_waiting, check, fail, cancel, system_fail, refund_process, refund_fail, refund_paid
    if (status === 'paid' || payment_status === 'paid') {
      console.log('✅ Payment confirmed - processing...');

      // Update user subscription or credits in Airtable
      await processSuccessfulPayment({
        userId: userData.user_id,
        userEmail: userData.user_email,
        planName: userData.plan_name,
        isSubscription: userData.is_subscription,
        amount,
        currency,
        orderId: order_id,
        paymentId: uuid
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Payment processed' })
      };
    } else if (status === 'cancel' || status === 'fail' || status === 'system_fail') {
      console.log('⚠️ Payment failed or cancelled:', status);
      // You could send an email notification here
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Payment failure noted' })
      };
    } else {
      console.log('🔄 Payment in progress:', status);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Status update received' })
      };
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message
      })
    };
  }
};

/**
 * Verify webhook signature from Cryptomus
 * Cryptomus signature: MD5(base64(JSON) + API_KEY)
 */
function verifySignature(data, receivedSign, apiKey) {
  if (!receivedSign) {
    console.error('❌ No signature provided in webhook');
    return false;
  }

  // Convert data to JSON string (NO sorting - use original order)
  const jsonString = JSON.stringify(data);

  // Encode JSON to base64
  const base64Data = Buffer.from(jsonString).toString('base64');

  // Create MD5 hash of: base64(JSON) + API_KEY
  const signString = base64Data + apiKey;
  const calculatedSign = crypto.createHash('md5').update(signString).digest('hex');

  console.log('🔐 Signature verification:', {
    received: receivedSign,
    calculated: calculatedSign,
    match: calculatedSign === receivedSign
  });

  return calculatedSign === receivedSign;
}

/**
 * Process successful payment - update Airtable
 */
async function processSuccessfulPayment(paymentInfo) {
  try {
    console.log('💳 Processing successful payment:', paymentInfo);

    const airtableToken = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;

    if (!airtableToken || !baseId) {
      throw new Error('Missing Airtable configuration');
    }

    // Find user in Airtable by email or user_id
    const findUserResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Users?filterByFormula=OR({Email}='${paymentInfo.userEmail}',{uid}='${paymentInfo.userId}')`,
      {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const userData = await findUserResponse.json();

    if (!userData.records || userData.records.length === 0) {
      console.error('❌ User not found in Airtable:', paymentInfo.userEmail);
      return;
    }

    const userRecord = userData.records[0];
    console.log('👤 User found:', userRecord.id);

    // Determine what to update based on payment type
    let updateFields = {};

    if (paymentInfo.isSubscription) {
      // Subscription payment - update plan
      const planName = paymentInfo.planName?.toLowerCase() || 'basic';
      const now = new Date();
      const nextBillingDate = new Date(now.setMonth(now.getMonth() + 1)).toISOString().split('T')[0];

      updateFields = {
        'plan': planName.charAt(0).toUpperCase() + planName.slice(1),
        'plan_start_date': new Date().toISOString().split('T')[0],
        'plan_end_date': nextBillingDate,
        'stripe_subscription_id': `crypto_${paymentInfo.paymentId}`, // Store payment ID
        'payment_provider': 'Cryptomus'
      };

      console.log('📅 Updating subscription fields:', updateFields);
    } else {
      // One-time credit purchase
      const currentCredits = parseInt(userRecord.fields.image_credits || 0);
      const creditAmount = getCreditAmountFromPrice(paymentInfo.amount);
      const newCredits = currentCredits + creditAmount;

      updateFields = {
        'image_credits': newCredits
      };

      console.log(`💎 Adding ${creditAmount} credits (total: ${newCredits})`);
    }

    // Update user record in Airtable
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Users/${userRecord.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: updateFields
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Failed to update Airtable:', errorText);
      throw new Error('Failed to update user data');
    }

    console.log('✅ User updated successfully in Airtable');

    // TODO: Send confirmation email to user

  } catch (error) {
    console.error('❌ Error processing payment:', error);
    throw error;
  }
}

/**
 * Map payment amount to credit amount
 */
function getCreditAmountFromPrice(amount) {
  const price = parseFloat(amount);

  // Match pricing from pricing.html
  if (price >= 19.99 && price <= 20.00) return 250; // Premium pack
  if (price >= 9.99 && price <= 10.00) return 100; // Basic pack
  if (price >= 5.99 && price <= 6.00) return 50;  // Light pack

  // Default fallback
  return Math.floor(price * 10);
}
