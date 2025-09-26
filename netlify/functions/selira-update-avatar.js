// Update Avatar URL for Selira companion in Airtable
exports.handler = async (event, context) => {
  // CORS headers
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Use Selira-specific environment variables
  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Missing Selira environment variables',
        needed: ['AIRTABLE_BASE_ID_SELIRA', 'AIRTABLE_TOKEN_SELIRA']
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { companionId, avatarUrl } = body;

    if (!companionId || !avatarUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: companionId and avatarUrl are required'
        })
      };
    }

    console.log('🔄 Updating Selira companion:', companionId);
    console.log('📸 Avatar URL:', avatarUrl);

    // Update the companion record in Airtable
    const updateResponse = await fetch(`https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters/${companionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          avatar_url: avatarUrl
        }
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Airtable update failed:', errorText);

      return {
        statusCode: updateResponse.status,
        headers,
        body: JSON.stringify({
          error: 'Failed to update Airtable record',
          details: errorText
        })
      };
    }

    const updatedRecord = await updateResponse.json();
    console.log('✅ Successfully updated companion:', updatedRecord.id);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        companionId: updatedRecord.id,
        avatarUrl: updatedRecord.fields.avatar_url,
        message: 'Avatar URL updated successfully'
      })
    };

  } catch (error) {
    console.error('❌ Update avatar error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Avatar update failed',
        details: error.message
      })
    };
  }
};