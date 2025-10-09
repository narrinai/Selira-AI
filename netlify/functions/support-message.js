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

    // Prepare data for Airtable - minimal version with only fields that exist
    // Start with just Message, add other fields if they exist in your Airtable
    const supportData = {
      Message: message.trim()
    };

    // Try to add optional fields - if they fail, the message will still be saved
    if (name) {
      supportData.Name = name;
    }
    if (email) {
      supportData.Email = email;
    }
    if (url) {
      supportData.URL = url;
    }

    console.log('💾 Support data to save:', JSON.stringify(supportData, null, 2));

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
    console.log('📡 Airtable response body:', responseText);

    if (!airtableResponse.ok) {
      console.error('❌ Airtable API error:', responseText);
      console.error('❌ Support data sent:', JSON.stringify(supportData, null, 2));

      let errorMessage = `Airtable error: ${airtableResponse.status}`;
      let errorDetails = '';
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error && errorData.error.message) {
          errorMessage = errorData.error.message;
          errorDetails = JSON.stringify(errorData.error, null, 2);
        }
      } catch (e) {
        // If not JSON, use status code
        errorDetails = responseText;
      }

      console.error('❌ Full error details:', errorDetails);

      // Return detailed error to help debug
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          debug: {
            status: airtableResponse.status,
            supportData: supportData,
            errorDetails: errorDetails.substring(0, 500) // Limit size
          }
        })
      };
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
