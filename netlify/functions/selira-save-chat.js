// Clean Selira chat saving function - no legacy code
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const { auth0_id, email, character_slug, user_message, ai_response } = JSON.parse(event.body);
    
    console.log('💾 Selira chat save:', { 
      email, 
      auth0_id: auth0_id?.substring(0, 20) + '...', 
      character: character_slug,
      hasUserMsg: !!user_message,
      hasAiMsg: !!ai_response
    });

    // Validate required fields
    if (!email || !auth0_id || !character_slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required fields: email, auth0_id, character_slug'
        })
      };
    }

    // Step 1: Find user by email (most reliable)
    console.log('🔍 Looking up user by email:', email);
    
    const userResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}='${email}'&maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.log('❌ User lookup failed:', userResponse.status);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: `User lookup failed: ${userResponse.status}`
        })
      };
    }

    const userData = await userResponse.json();
    
    if (userData.records.length === 0) {
      console.log('❌ User not found:', email);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'User not found',
          email: email
        })
      };
    }

    const userRecord = userData.records[0];
    console.log('✅ User found:', userRecord.id);

    // Step 2: Find character by slug
    console.log('🎭 Looking up character:', character_slug);
    
    const charResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let characterRecord = null;
    if (charResponse.ok) {
      const charData = await charResponse.json();
      if (charData.records.length > 0) {
        characterRecord = charData.records[0];
        console.log('✅ Character found:', characterRecord.fields.Name);
      }
    }

    if (!characterRecord) {
      console.log('❌ Character not found:', character_slug);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Character not found',
          character_slug: character_slug
        })
      };
    }

    // Step 3: Save messages to ChatHistory
    const messagesToSave = [];

    // User message
    if (user_message?.trim()) {
      messagesToSave.push({
        fields: {
          Role: 'user',
          Message: user_message.trim(),
          User: [userRecord.id],
          User_ID: userRecord.id, // Add text field for filtering (linked records can't be filtered)
          Character: [characterRecord.id]
        }
      });
    }

    // AI response
    if (ai_response?.trim()) {
      messagesToSave.push({
        fields: {
          Role: 'assistant',
          Message: ai_response.trim(),
          User: [userRecord.id],
          User_ID: userRecord.id, // Add text field for filtering (linked records can't be filtered)
          Character: [characterRecord.id]
        }
      });
    }

    if (messagesToSave.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'No messages to save'
        })
      };
    }

    console.log('💾 Saving', messagesToSave.length, 'messages to ChatHistory');

    const saveResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: messagesToSave })
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.text();
      console.error('❌ Failed to save messages:', saveResponse.status, errorData);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to save to ChatHistory',
          details: errorData
        })
      };
    }

    const saveData = await saveResponse.json();
    console.log('✅ Messages saved successfully:', saveData.records.length);

    // Step 4: Analyze user message for memory importance (if present)
    if (user_message?.trim()) {
      try {
        const analysisResponse = await fetch(`/.netlify/functions/analyze-memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: user_message,
            context: `Chat with ${characterRecord.fields.Name}`
          })
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          if (analysisData.success && analysisData.analysis.memory_importance >= 7) {
            console.log('🧠 Important memory detected:', analysisData.analysis.memory_importance);
            // Memory will be updated by separate function
          }
        }
      } catch (memoryError) {
        console.log('⚠️ Memory analysis failed:', memoryError.message);
        // Continue without memory analysis
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        saved_messages: saveData.records.length,
        user_id: userRecord.id,
        character_id: characterRecord.id,
        message: 'Chat saved successfully'
      })
    };

  } catch (error) {
    console.error('❌ Selira chat save error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};