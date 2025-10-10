// NOWPayments IPN (Instant Payment Notification) webhook handler
const crypto = require('crypto');
const Airtable = require('airtable');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body);

    console.log('🔔 NOWPayments webhook received:', {
      payment_status: payload.payment_status,
      order_id: payload.order_id,
      price_amount: payload.price_amount,
      price_currency: payload.price_currency
    });

    // Verify webhook signature (IPN Secret)
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (ipnSecret) {
      const receivedSignature = event.headers['x-nowpayments-sig'];
      const sortedPayload = JSON.stringify(sortKeys(payload));
      const expectedSignature = crypto
        .createHmac('sha512', ipnSecret)
        .update(sortedPayload)
        .digest('hex');

      if (receivedSignature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ NOWPAYMENTS_IPN_SECRET not set - skipping signature verification');
    }

    // Only process successful payments
    const validStatuses = ['finished', 'confirmed', 'sending'];
    if (!validStatuses.includes(payload.payment_status)) {
      console.log(`ℹ️ Ignoring payment with status: ${payload.payment_status}`);
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
    // Extract email from order_description if available
    const userEmail = payload.order_description ?
      payload.order_description.match(/for (.+)$/)?.[1] :
      'unknown';

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
      amount: payload.price_amount,
      currency: payload.price_currency
    });

    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN })
      .base(process.env.AIRTABLE_BASE_ID);

    // Find user in Airtable
    const userRecords = await base('Users')
      .select({
        filterByFormula: `{user_uid} = '${userId}'`,
        maxRecords: 1
      })
      .firstPage();

    if (userRecords.length === 0) {
      console.error('❌ User not found:', userId);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = userRecords[0];
    const currentCredits = parseInt(userRecord.fields.image_credits) || 0;
    const newCredits = currentCredits + parseInt(credits);

    console.log(`💰 Adding ${credits} credits to user ${userId} (${currentCredits} → ${newCredits})`);

    // Update user credits in Airtable
    await base('Users').update(userRecord.id, {
      image_credits: newCredits
    });

    console.log('✅ Credits added successfully');

    // Optional: Log transaction
    try {
      await base('Transactions').create({
        user_uid: userId,
        user_email: userEmail,
        transaction_type: 'credit_purchase',
        credits_added: parseInt(credits),
        amount: parseFloat(payload.price_amount),
        currency: payload.price_currency,
        payment_method: 'crypto',
        payment_provider: 'nowpayments',
        payment_status: payload.payment_status,
        order_id: payload.order_id,
        payment_id: payload.payment_id,
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
        credits_added: credits,
        new_total: newCredits
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

// Helper function to sort object keys for signature verification
function sortKeys(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortKeys(obj[key]);
  });
  return sorted;
}
