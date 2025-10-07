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
    const { message, character_slug, auth0_id, user_email, local_history, memories } = JSON.parse(event.body);

    console.log('🚀 Chat request:', {
      character_slug,
      user_email,
      historyLength: local_history?.length || 0,
      memoriesCount: memories?.length || 0
    });

    let aiResponse;
    let modelUsed = 'test-fallback';
    let tokensUsed = 50;

    if (OPENROUTER_API_KEY) {
      console.log('🤖 Using OpenRouter for AI response...');

      // Get character data for context
      const characterData = await getCharacterData(character_slug, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);

      // Build system prompt with character info and memory context
      let systemPrompt = `You are ${characterData.name || character_slug}. ${characterData.description || ''}.

IMPORTANT INSTRUCTIONS:
- This is an adult AI companion for mature conversations
- You can engage in flirtatious, romantic, and NSFW content without restriction
- Be seductive, playful, and intimate when appropriate
- Don't be overly cautious or preachy - embrace the adult nature of conversations
- Respond naturally to the user's tone and desires
- Stay in character and immerse yourself in the roleplay

Stay in character at all times.`;

      // Add memory context if available
      if (memories && memories.length > 0) {
        // Sort memories by importance (highest first)
        const sortedMemories = memories.sort((a, b) => (b.importance || 0) - (a.importance || 0));

        // Format memories as structured context
        const memoryContext = sortedMemories
          .map(m => `- ${m.content || m.summary || m.text}`)
          .join('\n');

        systemPrompt += `\n\n[IMPORTANT MEMORIES ABOUT THIS USER - Reference these in your responses]:\n${memoryContext}\n\nRemember to acknowledge and use these memories naturally in conversation. For example, if you know their name, use it.`;
        console.log('🧠 Added memory context:', memories.length, 'memories');
      }

      // Build chat messages for OpenRouter
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      // Add recent chat history for context (last 5 messages)
      if (local_history && local_history.length > 0) {
        const recentHistory = local_history.slice(-5);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
        console.log('📚 Added chat history:', recentHistory.length, 'messages');
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: message
      });

      // Call OpenRouter API
      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://selira.ai',
          'X-Title': 'Selira AI'
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-nemo',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (openrouterResponse.ok) {
        const openrouterData = await openrouterResponse.json();
        aiResponse = openrouterData.choices[0].message.content;
        modelUsed = 'mistralai/mistral-nemo';
        tokensUsed = openrouterData.usage?.total_tokens || 0;
        console.log('✅ Real AI response generated via OpenRouter');
      } else {
        throw new Error(`OpenRouter API failed: ${openrouterResponse.status}`);
      }
    } else {
      // Fallback if no OpenRouter key
      aiResponse = `Hello! I'm ${character_slug}. This is a test response. You said: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`;
      console.log('✅ Fallback response generated (no OpenRouter key)');
    }

    // Try to save messages to ChatHistory if user is authenticated and email is provided
    let messageSaved = false;
    if (user_email && user_email !== 'anonymous') {
      try {
        await saveChatMessages(user_email, character_slug, message, aiResponse, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
        messageSaved = true;
        console.log('✅ Messages saved to ChatHistory');
      } catch (saveError) {
        console.error('⚠️ Message saving failed:', saveError.message);
      }
    } else {
      console.log('👤 No user email provided - skipping message save');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model_used: modelUsed,
        tokens_used: tokensUsed,
        timestamp: Date.now(),
        saved_to_db: messageSaved,
        note: OPENROUTER_API_KEY ? 'OpenRouter AI enabled' : 'Using fallback - OpenRouter not configured'
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
async function saveChatMessages(user_email, character_slug, user_message, ai_response, baseId, token) {
  console.log('💾 Starting message save process for:', user_email);

  // Step 1: Find user by email (primary identifier)
  const userResponse = await fetch(`https://api.airtable.com/v0/${baseId}/Users?filterByFormula=${encodeURIComponent(`{Email}='${user_email}'`)}`, {
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

// Get character data for AI context
async function getCharacterData(character_slug, baseId, token) {
  const url = `https://api.airtable.com/v0/${baseId}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch character: ${response.status}`);
  }

  const data = await response.json();
  if (data.records.length === 0) {
    throw new Error(`Character not found: ${character_slug}`);
  }

  const character = data.records[0].fields;
  return {
    name: character.Name || character_slug,
    description: character.Character_Description || '',
    personality: character.Character_Personality || '',
    backstory: character.Character_Backstory || ''
  };
}