// OpenRouter Chat Function for Selira AI
// Replaces Make.com webhook with direct AI integration

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
  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!OPENROUTER_API_KEY || !SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing configuration' })
    };
  }

  try {
    const { 
      message, 
      character_slug, 
      auth0_id,
      model = 'mistralai/mistral-small' // Default to Mistral Small - fastest response times
    } = JSON.parse(event.body);

    console.log('🚀 OpenRouter chat request:', { character_slug, auth0_id, model });

    // Parallel data loading for speed
    const [characterData, memoryData, historyData] = await Promise.all([
      getCharacterData(character_slug),
      getRelevantMemories(auth0_id, character_slug),
      getChatHistory(auth0_id, character_slug, 10)
    ]);

    console.log('📊 Context loaded:', {
      character: characterData?.Name,
      memories: memoryData.length,
      history: historyData.length
    });

    // Build conversation context
    const systemPrompt = buildCharacterPrompt(characterData, memoryData);
    const conversationHistory = historyData.map(msg => ({
      role: msg.MessageType === 'user' ? 'user' : 'assistant',
      content: msg.Content
    }));

    // OpenRouter API call
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.URL || 'https://selira.ai',
        'X-Title': 'Selira AI Chat'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.8,
        top_p: 0.9
      })
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text();
      throw new Error(`OpenRouter API error: ${openrouterResponse.status} - ${errorText}`);
    }

    const openrouterData = await openrouterResponse.json();
    const aiResponse = openrouterData.choices[0].message.content;

    console.log('🤖 AI Response generated:', aiResponse.substring(0, 100) + '...');

    // Parallel save operations
    await Promise.all([
      saveMessage(auth0_id, character_slug, message, 'user'),
      saveMessage(auth0_id, character_slug, aiResponse, 'assistant'),
      updateMemoryIfNeeded(auth0_id, character_slug, message, aiResponse)
    ]);

    console.log('💾 Messages saved to database');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model_used: model,
        tokens_used: openrouterData.usage?.total_tokens,
        timestamp: Date.now()
      })
    };

  } catch (error) {
    console.error('❌ OpenRouter chat error:', error);
    
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

// Helper Functions

async function getCharacterData(character_slug) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch character: ${response.status}`);
  }

  const data = await response.json();
  return data.records[0]?.fields || null;
}

async function getRelevantMemories(auth0_id, character_slug, limit = 5) {
  // Get user record ID first
  const userUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) return [];

  const userData = await userResponse.json();
  if (userData.records.length === 0) return [];

  const userRecordId = userData.records[0].id;

  // Get memories for this user and character
  const memoriesUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Memories?filterByFormula=AND({UserID}='${userRecordId}',{CharacterSlug}='${character_slug}',{Importance}>=7)&sort[0][field]=Importance&sort[0][direction]=desc&maxRecords=${limit}`;
  
  const memoriesResponse = await fetch(memoriesUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!memoriesResponse.ok) return [];

  const memoriesData = await memoriesResponse.json();
  return memoriesData.records.map(record => record.fields);
}

async function getChatHistory(auth0_id, character_slug, limit = 10) {
  // Similar pattern as memories - get user record ID first
  const userUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) return [];

  const userData = await userResponse.json();
  if (userData.records.length === 0) return [];

  const userRecordId = userData.records[0].id;

  const historyUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Messages?filterByFormula=AND({UserID}='${userRecordId}',{CharacterSlug}='${character_slug}')&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=${limit}`;
  
  const historyResponse = await fetch(historyUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!historyResponse.ok) return [];

  const historyData = await historyResponse.json();
  return historyData.records.map(record => record.fields).reverse(); // Chronological order
}

function buildCharacterPrompt(characterData, memoryData) {
  if (!characterData) {
    return "You are a helpful AI assistant.";
  }

  let prompt = `You are ${characterData.Name}, ${characterData.Title}.\n\n`;
  prompt += `Character Description: ${characterData.Description}\n\n`;
  prompt += `Personality: ${characterData.Personality}\n\n`;

  if (memoryData.length > 0) {
    prompt += "Important memories about this user:\n";
    memoryData.forEach((memory, index) => {
      prompt += `${index + 1}. ${memory.Content}\n`;
    });
    prompt += "\n";
  }

  prompt += "Stay in character and provide helpful, engaging responses. Keep the conversation natural and remember the context from memories.";

  return prompt;
}

async function saveMessage(auth0_id, character_slug, content, message_type) {
  // Get user record ID
  const userUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user for message save');
  }

  const userData = await userResponse.json();
  if (userData.records.length === 0) {
    throw new Error('User not found for message save');
  }

  const userRecordId = userData.records[0].id;

  // Save message
  const messageUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Messages`;
  
  const messageResponse = await fetch(messageUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        UserID: [userRecordId],
        CharacterSlug: character_slug,
        MessageType: message_type,
        Content: content,
        Timestamp: new Date().toISOString(),
        SessionID: `${auth0_id}-${character_slug}-${Date.now()}`
      }
    })
  });

  if (!messageResponse.ok) {
    console.error('Failed to save message:', await messageResponse.text());
  }
}

async function updateMemoryIfNeeded(auth0_id, character_slug, userMessage, aiResponse) {
  // Simple memory creation logic
  // In production, you'd use AI to determine if this is worth remembering
  
  const conversationLength = userMessage.length + aiResponse.length;
  const hasEmotionalContent = /feel|emotion|stress|happy|sad|angry|love|fear/i.test(userMessage);
  
  let importance = 5; // Base importance
  
  if (conversationLength > 200) importance += 1;
  if (hasEmotionalContent) importance += 2;
  if (userMessage.includes('important') || userMessage.includes('remember')) importance += 2;
  
  if (importance >= 7) {
    // Save as memory
    const userUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
        'Content-Type': 'application/json'
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      if (userData.records.length > 0) {
        const userRecordId = userData.records[0].id;
        
        const memoryUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID_SELIRA}/Memories`;
        
        await fetch(memoryUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN_SELIRA}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              UserID: [userRecordId],
              CharacterSlug: character_slug,
              Content: `User said: "${userMessage}" - Context: This seemed important to the user.`,
              Importance: importance,
              EmotionalState: hasEmotionalContent ? 'emotional' : 'neutral',
              Context: 'chat_conversation',
              CreatedAt: new Date().toISOString(),
              LastAccessed: new Date().toISOString()
            }
          })
        });
        
        console.log(`🧠 Memory saved with importance: ${importance}`);
      }
    }
  }
}