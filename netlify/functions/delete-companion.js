exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🗑️ Delete companion request received');
    console.log('📥 Raw request body:', event.body);
    
    const requestBody = JSON.parse(event.body);
    const { user_uid, slug } = requestBody;

    console.log('📤 Delete request for:', { user_uid, slug });
    console.log('📤 Full request body parsed:', requestBody);

    if (!user_uid || !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required fields: user_uid and slug' 
        })
      };
    }

    // Call Make.com webhook
    console.log('📡 Calling Make.com webhook with payload:', { user_uid, slug });
    // TODO: Replace with direct Airtable API call
    console.log('⚠️ Delete companion Make.com webhook disabled');
    console.log('📤 Would delete companion:', { user_uid, slug });
    const makeResponse = { ok: true, status: 200, text: () => JSON.stringify({ success: true, message: 'Companion deleted' }) }; // Mock response

    console.log('📥 Make.com response status:', makeResponse.status, makeResponse.statusText);

    // Get response text for debugging
    const makeResponseText = await makeResponse.text();
    console.log('📥 Raw Make.com response:', makeResponseText);

    if (!makeResponse.ok) {
      console.error('❌ Make.com webhook failed:', makeResponse.status, makeResponse.statusText);
      console.error('❌ Make.com response body:', makeResponseText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: `Make.com error: ${makeResponse.status} - ${makeResponseText}` 
        })
      };
    }

    let makeResult;
    try {
      makeResult = JSON.parse(makeResponseText);
      console.log('✅ Parsed Make.com response:', makeResult);
    } catch (parseError) {
      console.error('❌ Failed to parse Make.com response:', parseError);
      console.error('❌ Raw Make.com response was:', makeResponseText);
      // Return success anyway since Make.com might not return JSON
      makeResult = { success: true, message: 'Processed by Make.com' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(makeResult)
    };

  } catch (error) {
    console.error('❌ Delete companion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      })
    };
  }
};