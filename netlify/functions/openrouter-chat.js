// OpenRouter Chat Function for Selira AI - Clean Version
// Simple chat function that works without complex dependencies

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔧 Environment check:', {
    hasOpenRouter: !!OPENROUTER_API_KEY,
    hasAirtableBase: !!AIRTABLE_BASE_ID,
    hasAirtableToken: !!AIRTABLE_TOKEN,
    baseIdLength: AIRTABLE_BASE_ID?.length,
    tokenLength: AIRTABLE_TOKEN?.length
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.log('❌ Missing Airtable configuration');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    const { message, character_slug, auth0_id } = JSON.parse(event.body);

    console.log('🚀 Chat request:', { character_slug, auth0_id: auth0_id?.substring(0, 20) + '...' });

    // For now, use fallback response since OpenRouter isn't configured
    const aiResponse = `Hello! I'm ${character_slug}. This is a test response. You said: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`;

    console.log('✅ Fallback response generated');

    // Try to save messages to ChatHistory if user is authenticated
    let messageSaved = false;
    if (auth0_id !== 'anonymous') {
      try {
        await saveChatMessages(auth0_id, character_slug, message, aiResponse, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
        messageSaved = true;
        console.log('✅ Messages saved to ChatHistory');
      } catch (saveError) {
        console.error('⚠️ Message saving failed:', saveError.message);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model_used: 'test-fallback',
        tokens_used: 50,
        timestamp: Date.now(),
        saved_to_db: messageSaved,
        note: OPENROUTER_API_KEY ? 'OpenRouter configured' : 'Using fallback - OpenRouter not configured',
        debug: {
          hasAirtableBase: !!AIRTABLE_BASE_ID,
          hasAirtableToken: !!AIRTABLE_TOKEN,
          baseIdLength: AIRTABLE_BASE_ID?.length,
          tokenLength: AIRTABLE_TOKEN?.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Chat function error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Chat generation failed',
        details: error.message,
        fallback_response: "I'm having trouble connecting right now. Could you try again in a moment?"
      })
    };
  }
};

// Save messages to ChatHistory table
async function saveChatMessages(auth0_id, character_slug, user_message, ai_response, baseId, token) {
  console.log('💾 Starting message save process...');

  // Step 1: Find user by NetlifyUID (which contains Auth0ID)
  const userResponse = await fetch(`https://api.airtable.com/v0/${baseId}/Users?filterByFormula={NetlifyUID}='${auth0_id}'&maxRecords=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) {
    throw new Error('User lookup failed');
  }

  const userData = await userResponse.json();
  if (userData.records.length === 0) {
    throw new Error('User not found in database');
  }

  const userRecordId = userData.records[0].id;
  const userEmail = userData.records[0].fields.Email;
  console.log('✅ Found user:', userEmail);

  // Step 2: Find character by slug
  const characterResponse = await fetch(`https://api.airtable.com/v0/${baseId}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!characterResponse.ok) {
    throw new Error('Character lookup failed');
  }

  const characterData = await characterResponse.json();
  if (characterData.records.length === 0) {
    throw new Error(`Character not found: ${character_slug}`);
  }

  const characterRecordId = characterData.records[0].id;
  const characterName = characterData.records[0].fields.Name;
  console.log('✅ Found character:', characterName);

  // Step 3: Save messages to ChatHistory
  const recordsToCreate = [];

  // User message
  if (user_message && user_message.trim()) {
    recordsToCreate.push({
      fields: {
        'Role': 'user',
        'Message': user_message.trim(),
        'User': [userRecordId],
        'Character': [characterRecordId]
      }
    });
  }

  // AI response
  if (ai_response && ai_response.trim()) {
    recordsToCreate.push({
      fields: {
        'Role': 'ai assistant',
        'Message': ai_response.trim(),
        'User': [userRecordId],
        'Character': [characterRecordId]
      }
    });
  }

  if (recordsToCreate.length > 0) {
    const chatHistoryResponse = await fetch(`https://api.airtable.com/v0/${baseId}/ChatHistory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: recordsToCreate })
    });

    if (!chatHistoryResponse.ok) {
      const errorData = await chatHistoryResponse.text();
      throw new Error(`ChatHistory save failed: ${errorData}`);
    }

    const result = await chatHistoryResponse.json();
    console.log(`✅ Saved ${result.records?.length || recordsToCreate.length} messages to ChatHistory`);
  }
}