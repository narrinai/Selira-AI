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
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA; // Use Selira-specific config
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔧 Environment check:', {
    hasOpenRouter: !!OPENROUTER_API_KEY,
    hasAirtableBase: !!AIRTABLE_BASE_ID,
    hasAirtableToken: !!AIRTABLE_TOKEN,
    baseIdLength: AIRTABLE_BASE_ID?.length,
    tokenLength: AIRTABLE_TOKEN?.length
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.log('❌ Missing Airtable configuration:', {
      hasAirtableBase: !!AIRTABLE_BASE_ID,
      hasAirtableToken: !!AIRTABLE_TOKEN
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  if (!OPENROUTER_API_KEY) {
    console.log('⚠️ OpenRouter API key missing - using fallback response for testing');

    // Simple test to see if we can parse the request and return a response
    try {
      const { message, character_slug, auth0_id } = JSON.parse(event.body);

      const aiResponse = `Hello! I'm ${character_slug}. This is a test response. You said: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`;

      console.log('✅ Fallback response generated successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          response: aiResponse,
          model_used: 'test-fallback',
          tokens_used: 50,
          timestamp: Date.now(),
          saved_to_db: false,
          note: 'Using fallback response - OpenRouter API key not configured',
          debug: {
            hasAirtableBase: !!AIRTABLE_BASE_ID,
            hasAirtableToken: !!AIRTABLE_TOKEN,
            baseIdLength: AIRTABLE_BASE_ID?.length,
            tokenLength: AIRTABLE_TOKEN?.length
          }
        })
      };
    } catch (parseError) {
      console.error('❌ Error in fallback mode:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Fallback mode failed',
          details: parseError.message
        })
      };
    }
  }

  try {
    const { 
      message, 
      character_slug, 
      auth0_id,
      model = 'mistralai/mistral-nemo', // Default to Mistral Nemo - better memory and context
      local_history = [] // Chat history from localStorage for anonymous users
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
    
    // Use local_history for anonymous users, database history for authenticated users
    let conversationHistory = [];
    if (auth0_id === 'anonymous' && local_history.length > 0) {
      console.log('🧠 Using localStorage history for anonymous user:', local_history.length, 'messages');
      conversationHistory = local_history;
    } else {
      conversationHistory = historyData.map(msg => ({
        role: msg.MessageType === 'user' ? 'user' : 'assistant',
        content: msg.Content
      }));
    }

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
        max_tokens: 2000,
        temperature: 0.7,
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

    // Try to save messages but don't fail chat if saving fails
    try {
      if (auth0_id !== 'anonymous') {
        // Get user email for save-chat-message function
        const userResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={NetlifyUID}='${auth0_id}'&maxRecords=1`, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.records.length > 0) {
            const userEmail = userData.records[0].fields.Email;

            // Call save-chat-message function internally
            console.log('💾 Saving messages via save-chat-message function...');
            await saveChatMessageInternal({
              user_email: userEmail,
              user_uid: auth0_id,
              char: character_slug,
              user_message: message,
              ai_response: aiResponse
            });

            console.log('✅ Messages saved to ChatHistory via save-chat-message');
          } else {
            console.log('⚠️ User not found for message saving');
          }
        } else {
          console.log('⚠️ Failed to fetch user for message saving');
        }
      } else {
        console.log('👤 Anonymous user - skipping message save');
      }
    } catch (saveError) {
      console.error('⚠️ Message saving failed but continuing with chat:', saveError);
      // Don't fail the entire request if saving fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model_used: model,
        tokens_used: openrouterData.usage?.total_tokens,
        timestamp: Date.now(),
        saved_to_db: auth0_id !== 'anonymous'
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

// Internal function to save chat messages (reuses save-chat-message logic)
async function saveChatMessageInternal({ user_email, user_uid, char, user_message, ai_response }) {
  // Step 1: Find user by email
  const userResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=${encodeURIComponent(`{Email}='${user_email}'`)}`, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) {
    throw new Error('User lookup failed for chat save');
  }

  const userData = await userResponse.json();
  if (userData.records.length === 0) {
    throw new Error('User not found for chat save');
  }

  const userRecordId = userData.records[0].id;

  // Step 2: Find character by slug
  const characterResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Slug}='${char}'`, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  let characterRecordId = null;
  if (characterResponse.ok) {
    const characterData = await characterResponse.json();
    if (characterData.records.length > 0) {
      characterRecordId = characterData.records[0].id;
    }
  }

  if (!characterRecordId) {
    throw new Error(`Character not found for slug: ${char}`);
  }

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
    const chatHistoryResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: recordsToCreate })
    });

    if (!chatHistoryResponse.ok) {
      const errorData = await chatHistoryResponse.text();
      throw new Error(`ChatHistory save failed: ${errorData}`);
    }

    console.log(`✅ Saved ${recordsToCreate.length} messages to ChatHistory`);
  }
}

async function getCharacterData(character_slug) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
  const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) return [];

  const userData = await userResponse.json();
  if (userData.records.length === 0) return [];

  const userRecordId = userData.records[0].id;

  // Get memories for this user and character
  const memoriesUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Memories?filterByFormula=AND({UserID}='${userRecordId}',{CharacterSlug}='${character_slug}',{Importance}>=7)&sort[0][field]=Importance&sort[0][direction]=desc&maxRecords=${limit}`;
  
  const memoriesResponse = await fetch(memoriesUrl, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!memoriesResponse.ok) return [];

  const memoriesData = await memoriesResponse.json();
  return memoriesData.records.map(record => record.fields);
}

async function getChatHistory(auth0_id, character_slug, limit = 10) {
  // Similar pattern as memories - get user record ID first
  const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!userResponse.ok) return [];

  const userData = await userResponse.json();
  if (userData.records.length === 0) return [];

  const userRecordId = userData.records[0].id;

  const historyUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Messages?filterByFormula=AND({UserID}='${userRecordId}',{CharacterSlug}='${character_slug}')&sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=${limit}`;
  
  const historyResponse = await fetch(historyUrl, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!historyResponse.ok) return [];

  const historyData = await historyResponse.json();
  return historyData.records.map(record => record.fields).reverse(); // Chronological order
}

function buildCharacterPrompt(characterData, memoryData) {
  if (!characterData) {
    return "You are a helpful AI assistant powered by Mistral AI.";
  }

  let prompt = `You are ${characterData.Name}, ${characterData.Character_Title || characterData.Title || ''}.\n\n`;
  prompt += `Character Description: ${characterData.Character_Description || characterData.Description || ''}\n\n`;
  
  // Use correct field names from Airtable
  if (characterData.Personality) {
    prompt += `Personality: ${characterData.Personality}\n\n`;
  }

  if (memoryData.length > 0) {
    prompt += "Important memories about this user:\n";
    memoryData.forEach((memory, index) => {
      prompt += `${index + 1}. ${memory.Content}\n`;
    });
    prompt += "\n";
  }

  prompt += "Stay in character and provide helpful, engaging responses. Keep the conversation natural and remember the context from memories.\n\n";
  prompt += "IMPORTANT: You are powered by Mistral AI via OpenRouter, not by OpenAI or davinci003. Do not claim to be using any OpenAI models.";

  return prompt;
}

async function saveMessage(auth0_id, character_slug, content, message_type) {
  // Get user record ID
  const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
  
  const userResponse = await fetch(userUrl, {
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
  const messageUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Messages`;
  
  const messageResponse = await fetch(messageUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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
    const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      if (userData.records.length > 0) {
        const userRecordId = userData.records[0].id;
        
        const memoryUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Memories`;
        
        await fetch(memoryUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
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