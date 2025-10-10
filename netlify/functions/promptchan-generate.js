const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const requestData = JSON.parse(event.body);

    // Get API key from environment variables
    const apiKey = process.env.PROMPTCHAN_API_KEY_SELIRA;

    if (!apiKey) {
      console.error('❌ Promptchan API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    console.log('🎨 Generating image with Promptchan API...');
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    // Make request to Promptchan API
    const response = await fetch('https://prod.aicloudnetservices.com/api/external/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();
    console.log('API Response status:', response.status);
    console.log('API Response body:', responseText);

    if (!response.ok) {
      console.error('❌ Promptchan API error:', response.status, responseText);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to generate image',
          details: responseText
        })
      };
    }

    // Parse the response
    const data = JSON.parse(responseText);

    console.log('✅ Image generated successfully');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        image: data.image,
        gems: data.gems
      })
    };

  } catch (error) {
    console.error('❌ Promptchan function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
