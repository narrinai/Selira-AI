// Proxy function to fetch images and add CORS headers
// This allows the frontend to download images from third-party sources without CORS issues

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    console.log('🖼️ Proxying image:', imageUrl);

    // Fetch the image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('✅ Image fetched, size:', buffer.length);

    // Return the image with CORS headers
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Content-Length': buffer.length,
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('❌ Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to proxy image: ' + error.message })
    };
  }
};
