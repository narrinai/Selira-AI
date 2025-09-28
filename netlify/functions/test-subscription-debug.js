exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 Test function called');
    console.log('📋 Event method:', event.httpMethod);
    console.log('📋 Event body:', event.body);

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { action, userEmail, auth0Id } = JSON.parse(event.body || '{}');

    console.log('✅ Parsed request data:', {
      action,
      userEmail,
      hasAuth0Id: !!auth0Id,
      auth0Id: auth0Id
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test function working',
        receivedData: {
          action,
          userEmail,
          auth0Id
        }
      })
    };

  } catch (error) {
    console.error('❌ Test function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test function failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};