// Netlify Function to provide Auth0 configuration for Selira AI
// This keeps your Auth0 credentials secure while making them available to the client

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get Auth0 configuration from environment variables
    const authConfig = {
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      // Don't expose sensitive data like client secret
    };

    // Validate that required config exists
    if (!authConfig.domain || !authConfig.clientId) {
      console.error('❌ Missing Selira Auth0 configuration:', {
        domain: !!authConfig.domain,
        clientId: !!authConfig.clientId
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Selira Auth0 configuration not found in environment variables'
        })
      };
    }

    console.log('✅ Selira Auth0 config provided:', {
      domain: authConfig.domain,
      clientId: authConfig.clientId.substring(0, 8) + '...'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: authConfig
      })
    };

  } catch (error) {
    console.error('❌ Selira auth config function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to load Selira authentication configuration'
      })
    };
  }
};