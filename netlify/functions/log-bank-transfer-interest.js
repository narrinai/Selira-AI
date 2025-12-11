const Airtable = require('airtable');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { recordId, userEmail, packageType, action } = JSON.parse(event.body);

    console.log('🏦 Bank transfer interest request:', { recordId, userEmail, packageType, action });

    if (!recordId && !userEmail) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'recordId or userEmail is required' })
      };
    }

    // Initialize Airtable (Selira uses _SELIRA suffix for env vars)
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID);

    let userRecord;

    // Try to find user by record ID first, then by email
    if (recordId) {
      try {
        userRecord = await base('Users').find(recordId);
        console.log('✅ Found user by record ID:', recordId);
      } catch (err) {
        console.log('⚠️ Could not find user by record ID, trying email...');
      }
    }

    if (!userRecord && userEmail) {
      const records = await base('Users').select({
        filterByFormula: `{Email} = '${userEmail}'`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        userRecord = records[0];
        console.log('✅ Found user by email:', userEmail);
      }
    }

    if (!userRecord) {
      console.error('❌ User not found');
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const currentCount = userRecord.fields.bank_transfer_interest || 0;

    // Map package types to readable names
    const packageNames = {
      'light_pack': 'Light Pack',
      'basic_pack': 'Basic Pack',
      'premium_pack': 'Premium Pack'
    };

    // Update the user record
    await base('Users').update(userRecord.id, {
      'bank_transfer_interest': currentCount + 1,
      'bank_transfer_last_click': new Date().toISOString(),
      'bank_transfer_package': packageNames[packageType] || packageType
    });

    console.log(`✅ Bank transfer interest logged for user ${userEmail || recordId}: ${packageType} (action: ${action}, count: ${currentCount + 1})`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Interest logged' })
    };

  } catch (error) {
    console.error('❌ Error logging bank transfer interest:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to log interest' })
    };
  }
};
