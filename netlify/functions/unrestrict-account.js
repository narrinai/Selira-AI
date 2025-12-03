// Unrestrict Account Function
// Removes ban/restriction from a user account
// Usage: POST with { email: "user@example.com", resetViolations: true/false }

const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Simple admin check - require admin secret
  const adminSecret = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    console.log('❌ Unauthorized: Invalid or missing admin secret');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { email, resetViolations = false } = body;

  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Email is required' })
    };
  }

  console.log(`🔓 Unrestrict account request for: ${email}`);
  console.log(`   Reset violations: ${resetViolations}`);

  try {
    // Initialize Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    // Find user by email
    const records = await base('Users')
      .select({
        filterByFormula: `{Email} = "${email}"`,
        maxRecords: 1
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log('❌ User not found:', email);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const userRecord = records[0];
    const currentStatus = {
      is_banned: userRecord.fields.is_banned || false,
      ban_reason: userRecord.fields.ban_reason || null,
      content_violations: userRecord.fields.content_violations || 0
    };

    console.log('📋 Current status:', currentStatus);

    // Build update payload
    const updatePayload = {
      is_banned: false,
      ban_reason: null
    };

    if (resetViolations) {
      updatePayload.content_violations = 0;
    }

    // Update user record
    await base('Users').update(userRecord.id, updatePayload);

    console.log('✅ Account unrestricted successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Account unrestricted successfully',
        email: email,
        previousStatus: currentStatus,
        resetViolations: resetViolations
      })
    };

  } catch (error) {
    console.error('❌ Error unrestricting account:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};
