// Simple function to update avatar URL in Selira database

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing Selira database credentials'
      })
    };
  }

  try {
    const { recordId, avatarUrl } = JSON.parse(event.body);

    if (!recordId || !avatarUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Record ID and avatar URL are required' })
      };
    }

    console.log('📝 Updating Selira character avatar:', { recordId, avatarUrl: avatarUrl.substring(0, 50) + '...' });

    // Update the record in Selira Airtable
    const response = await fetch(`https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters/${recordId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Avatar_URL: avatarUrl
        }
      })
    });

    if (response.ok) {
      const updatedRecord = await response.json();
      console.log('✅ Selira avatar updated successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          record: updatedRecord,
          avatarUrl: avatarUrl
        })
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Airtable update failed:', errorText);

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Failed to update avatar in Selira database',
          details: errorText
        })
      };
    }

  } catch (error) {
    console.error('❌ Selira update avatar error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};