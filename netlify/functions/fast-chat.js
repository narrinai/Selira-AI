// Optimized fast chat function for Selira AI
// Minimizes database calls for 0.5-1 second response times

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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

  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  try {
    const startTime = Date.now();
    const { 
      message, 
      character_slug, 
      auth0_id,
      model = 'mistralai/mistral-nemo'
    } = JSON.parse(event.body);

    console.log('⚡ Fast chat started:', { character_slug, auth0_id });

    // OPTIMIZATION 1: Single user lookup for all operations
    const userUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let userRecordId = null;
    if (userResponse.ok) {
      const userData = await userResponse.json();
      if (userData.records.length > 0) {
        userRecordId = userData.records[0].id;
      }
    }

    // OPTIMIZATION 2: Parallel loading with simplified data
    const [characterData, recentHistory] = await Promise.all([
      // Get character (essential)
      getCharacterFast(character_slug),
      
      // Get only last 3 messages (not full history) 
      userRecordId ? getRecentMessagesFast(userRecordId, character_slug, 3) : []
      
      // SKIP memory for speed - only use recent history
    ]);

    console.log(`📊 Data loaded in ${Date.now() - startTime}ms`);

    if (!characterData) {
      throw new Error('Character not found');
    }

    // OPTIMIZATION 3: Minimal prompt for speed
    const systemPrompt = `You are ${characterData.Name}. ${characterData.Character_Description || characterData.Description || ''}\n\n${characterData.Prompt || ''}`;

    const conversationHistory = recentHistory.map(msg => ({
      role: msg.MessageType === 'user' ? 'user' : 'assistant',
      content: msg.Content
    }));

    // OPTIMIZATION 4: Faster OpenRouter call
    const aiStartTime = Date.now();
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://selira.ai',
        'X-Title': 'Selira AI'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 800,  // Reduced for faster response
        temperature: 0.7  // Slightly reduced for consistency
      })
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      throw new Error(`OpenRouter error: ${openrouterResponse.status} - ${errorText}`);
    }

    const openrouterData = await openrouterResponse.json();
    const aiResponse = openrouterData.choices[0].message.content;
    const aiTime = Date.now() - aiStartTime;

    console.log(`🤖 AI response in ${aiTime}ms`);

    // OPTIMIZATION 5: Background message save (don't block response)
    if (userRecordId) {
      // Save in background - don't await
      saveMessagesFast(userRecordId, character_slug, message, aiResponse).catch(err => 
        console.error('Background save failed:', err)
      );
    }

    const totalTime = Date.now() - startTime;
    console.log(`⚡ Total response time: ${totalTime}ms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model_used: model,
        performance: {
          total_time_ms: totalTime,
          ai_time_ms: aiTime,
          data_load_time_ms: totalTime - aiTime
        },
        timestamp: Date.now()
      })
    };

  } catch (error) {
    console.error('❌ Fast chat error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Chat failed',
        details: error.message,
        fallback_response: "I'm having trouble right now. Could you try again?"
      })
    };
  }
};

// Optimized helper functions

async function getCharacterFast(character_slug) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.records[0]?.fields || null;
}

async function getRecentMessagesFast(userRecordId, character_slug, limit = 3) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/ChatHistory?filterByFormula=AND({User}='${userRecordId}',{Character}='${character_slug}')&sort[0][field]=CreatedTime&sort[0][direction]=desc&maxRecords=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) return [];

  const data = await response.json();
  return data.records.map(record => record.fields).reverse();
}

async function saveMessagesFast(userRecordId, character_slug, userMessage, aiResponse) {
  // Save both messages in parallel (background operation)
  const timestamp = new Date().toISOString();
  
  const savePromises = [
    // User message
    fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/ChatHistory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          User: [userRecordId],
          Character: character_slug,
          Role: 'user',
          Message: userMessage,
          CreatedTime: timestamp
        }
      })
    }),
    
    // AI message
    fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/ChatHistory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          User: [userRecordId],
          Character: character_slug,
          Role: 'assistant', 
          Message: aiResponse,
          CreatedTime: timestamp
        }
      })
    })
  ];

  await Promise.all(savePromises);
  console.log('💾 Messages saved in background');
}