// Save support messages to Airtable
exports.handler = async (event, context) => {
  console.log('💬 Support message function called');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Airtable credentials not found');
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, message, userId, url, userAgent } = body;

    console.log('📋 Support message data:', {
      name,
      email: email ? 'provided' : 'not provided',
      messageLength: message?.length,
      userId,
      url
    });

    if (!message || message.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Try to find user record by email for linked record
    let userRecordId = null;
    if (email || userId) {
      try {
        console.log('🔍 Looking up user record by email:', email || userId);
        const searchEmail = email || userId;
        const userLookupResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}="${searchEmail}"`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (userLookupResponse.ok) {
          const userLookupData = await userLookupResponse.json();
          if (userLookupData.records && userLookupData.records.length > 0) {
            userRecordId = userLookupData.records[0].id;
            console.log('✅ Found user record ID:', userRecordId);
          } else {
            console.log('⚠️ No user found with email:', searchEmail);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not lookup user record:', error.message);
      }
    }

    // Prepare data for Airtable with linked record
    const supportData = {
      Message: message.trim(),
      Page_URL: url || '',
      User_Agent: userAgent || '',
      Status: 'New'
    };

    // Add user as linked record if found, otherwise store as text fields
    if (userRecordId) {
      supportData.User = [userRecordId]; // Linked record to Users table
      console.log('✅ Linking message to user record:', userRecordId);
    } else {
      // Fallback: store as text fields for anonymous users
      supportData.Anonymous_Name = name || 'Anonymous';
      supportData.Anonymous_Email = email || '';
      console.log('⚠️ No user record - storing as anonymous message');
    }

    console.log('💾 Saving to Airtable Support_Messages table...');

    // Save to Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Support_Messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: supportData
        })
      }
    );

    const responseText = await airtableResponse.text();
    console.log('📡 Airtable response status:', airtableResponse.status);

    if (!airtableResponse.ok) {
      console.error('❌ Airtable API error:', responseText);
      throw new Error(`Airtable error: ${airtableResponse.status}`);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Support message saved:', result.id);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        messageId: result.id
      })
    };

  } catch (error) {
    console.error('❌ Support message error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to save support message',
        details: error.message
      })
    };
  }
};
