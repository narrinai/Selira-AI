// Cryptomus webhook handler for crypto payments
const crypto = require('crypto');
const Airtable = require('airtable');

// Cryptomus webhook IP whitelist
const ALLOWED_IPS = ['91.227.144.54'];

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Optional: Verify IP address
    const clientIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     event.headers['client-ip'] ||
                     'unknown';

    console.log('🔔 Cryptomus webhook received from IP:', clientIP);

    // Parse payload
    const payload = JSON.parse(event.body);

    console.log('📦 Webhook payload:', {
      status: payload.status,
      order_id: payload.order_id,
      uuid: payload.uuid,
      amount: payload.amount,
      currency: payload.currency,
      is_final: payload.is_final
    });

    // Verify webhook signature
    const API_KEY = process.env.CRYPTOMUS_PAYMENT_API_KEY_SELIRA;

    if (API_KEY && payload.sign) {
      // Remove sign from payload for verification
      const receivedSign = payload.sign;
      const dataToVerify = { ...payload };
      delete dataToVerify.sign;

      // Cryptomus signature: MD5(base64(json_body) + api_key)
      // Note: PHP escapes forward slashes, JS doesn't - try both ways
      const jsonString = JSON.stringify(dataToVerify);
      const base64Data = Buffer.from(jsonString).toString('base64');
      const expectedSign = crypto
        .createHash('md5')
        .update(base64Data + API_KEY)
        .digest('hex');

      // Also try with escaped slashes (PHP style)
      const jsonStringEscaped = jsonString.replace(/\//g, '\\/');
      const base64DataEscaped = Buffer.from(jsonStringEscaped).toString('base64');
      const expectedSignEscaped = crypto
        .createHash('md5')
        .update(base64DataEscaped + API_KEY)
        .digest('hex');

      if (receivedSign !== expectedSign && receivedSign !== expectedSignEscaped) {
        console.error('❌ Invalid webhook signature');
        console.error('Received:', receivedSign);
        console.error('Expected:', expectedSign);
        console.error('Expected (escaped):', expectedSignEscaped);
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ Signature verification skipped - API_KEY or sign not available');
    }

    // Only process successful payments
    // Cryptomus statuses: confirm_check, paid, paid_over, fail, wrong_amount, cancel, system_fail, refund_process, refund_fail, refund_paid
    const successStatuses = ['paid', 'paid_over'];

    if (!successStatuses.includes(payload.status)) {
      console.log(`ℹ️ Ignoring payment with status: ${payload.status}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Status noted, no action needed' })
      };
    }

    // Parse metadata from order_id
    // Format: selira_{planType}_{credits}_{userId}_{timestamp}
    const orderIdParts = payload.order_id.split('_');

    if (orderIdParts.length < 5 || orderIdParts[0] !== 'selira') {
      console.error('❌ Invalid order_id format:', payload.order_id);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid order_id format' })
      };
    }

    const planType = orderIdParts[1];
    const credits = parseInt(orderIdParts[2]);
    const userId = orderIdParts[3];

    // Try to get additional data if available
    let userEmail = 'unknown';
    if (payload.additional_data) {
      try {
        const additionalData = JSON.parse(payload.additional_data);
        userEmail = additionalData.userEmail || 'unknown';
      } catch (e) {
        console.warn('⚠️ Could not parse additional_data');
      }
    }

    if (!userId || !credits) {
      console.error('❌ Missing required metadata from order_id:', { userId, credits });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing userId or credits in order_id' })
      };
    }

    console.log('💳 Processing payment:', {
      userId,
      userEmail,
      credits,
      planType,
      amount: payload.amount,
      currency: payload.currency,
      payment_amount_usd: payload.payment_amount_usd
    });

    // Initialize Airtable
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
    const base = new Airtable({ apiKey: AIRTABLE_TOKEN })
      .base(AIRTABLE_BASE_ID);

    // Find user in Airtable - try SupabaseID first, then email
    console.log(`🔍 Searching for user in Airtable: ${userId} / ${userEmail}`);

    let userRecords = await base('Users')
      .select({
        filterByFormula: `{SupabaseID} = '${userId}'`,
        maxRecords: 1
      })
      .firstPage();

    // Fallback: search by email if not found by SupabaseID
    if (userRecords.length === 0 && userEmail && userEmail !== 'unknown') {
      console.log(`🔍 User not found by SupabaseID, trying email: ${userEmail}`);
      userRecords = await base('Users')
        .select({
          filterByFormula: `{Email} = '${userEmail}'`,
          maxRecords: 1
        })
        .firstPage();
    }

    if (userRecords.length === 0) {
      console.error('❌ User not found in Airtable:', {
        userId,
        userEmail,
        baseId: AIRTABLE_BASE_ID
      });
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: 'User not found',
          userId: userId,
          userEmail: userEmail
        })
      };
    }

    const userRecord = userRecords[0];
    const currentPurchased = parseInt(userRecord.fields.image_credits_purchased) || 0;
    const currentRemaining = parseInt(userRecord.fields.image_credits_remaining) || 0;
    const creditsToAdd = parseInt(credits);

    console.log(`💰 Adding ${creditsToAdd} credits to user ${userId}`);
    console.log(`   Purchased: ${currentPurchased} → ${currentPurchased + creditsToAdd}`);
    console.log(`   Remaining: ${currentRemaining} → ${currentRemaining + creditsToAdd}`);

    // Update user credits in Airtable
    await base('Users').update(userRecord.id, {
      image_credits_purchased: currentPurchased + creditsToAdd,
      image_credits_remaining: currentRemaining + creditsToAdd
    });

    console.log('✅ Credits added successfully');

    // Log transaction
    try {
      await base('Transactions').create({
        user_uid: userId,
        user_email: userEmail,
        transaction_type: 'credit_purchase',
        credits_added: creditsToAdd,
        amount: parseFloat(payload.payment_amount_usd || payload.amount),
        currency: 'USD',
        payment_method: 'crypto',
        payment_provider: 'cryptomus',
        payment_status: payload.status,
        order_id: payload.order_id,
        payment_id: payload.uuid,
        network: payload.network || 'unknown',
        payer_currency: payload.payer_currency || payload.currency,
        created_at: new Date().toISOString()
      });
      console.log('✅ Transaction logged');
    } catch (logError) {
      console.warn('⚠️ Failed to log transaction:', logError.message);
      // Don't fail the webhook if logging fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        credits_added: creditsToAdd,
        new_purchased: currentPurchased + creditsToAdd,
        new_remaining: currentRemaining + creditsToAdd
      })
    };

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
