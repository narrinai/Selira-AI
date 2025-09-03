// Get Chat History Function for Selira AI  
// Optimized version without Make.com dependency

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    const { auth0_id, character_slug, limit = 50 } = JSON.parse(event.body);

    console.log('📖 Getting chat history:', { auth0_id, character_slug, limit });

    // Get user record ID from Auth0 ID
    const userUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to find user');
    }

    const userData = await userResponse.json();
    if (userData.records.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          history: [],
          message: 'New user - no history yet'
        })
      };
    }

    const userRecordId = userData.records[0].id;

    // Get chat messages for this user and character
    const messagesUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Messages?filterByFormula=AND({UserID}='${userRecordId}',{CharacterSlug}='${character_slug}')&sort[0][field]=Timestamp&sort[0][direction]=asc&maxRecords=${limit}`;
    
    const messagesResponse = await fetch(messagesUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!messagesResponse.ok) {
      throw new Error('Failed to fetch messages');
    }

    const messagesData = await messagesResponse.json();
    
    // Format history for frontend
    const history = messagesData.records.map(record => ({
      MessageType: record.fields.MessageType,
      Content: record.fields.Content,
      Timestamp: record.fields.Timestamp,
      SessionID: record.fields.SessionID
    }));

    console.log(`📊 Retrieved ${history.length} messages`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        history: history,
        total_messages: history.length,
        character: character_slug
      })
    };

  } catch (error) {
    console.error('❌ Chat history error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get chat history',
        details: error.message
      })
    };
  }
};