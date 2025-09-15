// Content validation function
function validateCharacterContent(data) {
  // Content moderation lists
  const nsfwTerms = [
    'nsfw', 'adult', 'explicit', 'sexual', 'erotic', 'porn', 'xxx', 
    'nude', 'naked', 'sex', 'fetish', 'bdsm', 'kink', 'lewd',
    'hentai', 'onlyfans', 'stripper', 'escort', 'prostitute'
  ];
  
  const extremistTerms = [
    'nazi', 'hitler', 'supremacist', 'kkk', 'fascist', 'reich',
    'aryan', 'holocaust denial', 'ethnic cleansing', 'genocide',
    'white power', 'race war', 'master race'
  ];
  
  const racistTerms = [
    'nigger', 'chink', 'spic', 'kike', 'gook', 'wetback',
    'racial slur', 'racist', 'apartheid', 'segregation',
    'racial superiority', 'ethnic hate'
  ];
  
  // Get text fields to check
  const name = data.name || data.character_data?.name || '';
  const description = data.description || data.character_data?.description || '';
  const prompt = data.prompt || data.character_data?.prompt || '';
  const title = data.title || data.character_data?.title || '';
  
  // Combine all text fields for checking
  const allText = `${name} ${description} ${prompt} ${title}`.toLowerCase();
  
  // Check for inappropriate content
  for (const term of nsfwTerms) {
    if (allText.includes(term)) {
      return { inappropriate: true, reason: 'NSFW content detected', category: 'nsfw' };
    }
  }
  
  for (const term of extremistTerms) {
    if (allText.includes(term)) {
      return { inappropriate: true, reason: 'Extremist content detected', category: 'extremist' };
    }
  }
  
  for (const term of racistTerms) {
    if (allText.includes(term)) {
      return { inappropriate: true, reason: 'Racist content detected', category: 'racist' };
    }
  }
  
  return { inappropriate: false };
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
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
    const requestBody = JSON.parse(event.body || '{}');
    
    // Log all incoming requests to debug
    console.log('📥 Incoming request:', {
      action: requestBody.action,
      hasUserUID: !!requestBody.user_uid,
      timestamp: new Date().toISOString()
    });
    
    // If this is a character creation request, validate content first
    if (requestBody.action === 'create_character') {
      console.log('🔍 Validating character content before creation');
      
      // Content validation
      const contentCheck = validateCharacterContent(requestBody);
      
      if (contentCheck.inappropriate && requestBody.visibility === 'public') {
        // Force private mode for inappropriate content
        console.log(`⚠️ Forcing private mode due to: ${contentCheck.reason}`);
        requestBody.visibility = 'private';
        if (requestBody.character_data) {
          requestBody.character_data.visibility = 'private';
        }
      }
    }
    
    // Only forward character creation requests to Make.com
    if (requestBody.action === 'create_character') {
      // Extra validation: ensure we have actual character data
      if (!requestBody.name || !requestBody.user_uid) {
        console.log('⚠️ Blocking incomplete character creation request');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required fields for character creation',
            missingFields: {
              name: !requestBody.name,
              user_uid: !requestBody.user_uid
            }
          })
        };
      }
      
      console.log('📤 Forwarding valid character creation to Make.com');
      
      // Create character directly in Airtable
      const airtableResult = await createCharacterInAirtable(requestBody);
      
      if (!airtableResult.success) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify(airtableResult)
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(airtableResult)
      };
    } 
    // Handle get_tags action locally
    else if (requestBody.action === 'get_tags') {
      console.log('📋 Handling get_tags request locally');
      
      // Return predefined tags or empty array
      // These should match the tags available in Airtable
      const tags = [
        'wise', 'funny', 'helpful', 'mysterious', 'leader',
        'creative', 'romantic', 'adventure', 'teacher', 'mentor',
        'villain', 'hero', 'scientist', 'artist', 'warrior',
        'historical', 'magical', 'supportive', 'strategic', 'philosophical'
      ];
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          tags: tags
        })
      };
    }
    else {
      // Unknown action - log it for debugging
      console.log('❓ Unknown action received:', requestBody.action);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Unknown action',
          receivedAction: requestBody.action,
          message: 'Only create_character and get_tags actions are supported'
        })
      };
    }

  } catch (error) {
    console.error('❌ Webhook proxy error:', error);
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

// Create character directly in Airtable
async function createCharacterInAirtable(requestBody) {
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      success: false,
      error: 'Missing Airtable configuration'
    };
  }

  try {
    console.log('📝 Creating character in Airtable:', requestBody.character_data?.name);

    const characterData = requestBody.character_data || requestBody;
    
    // Prepare Airtable fields
    const fields = {
      Name: characterData.name || 'Unnamed Character',
      Character_Description: characterData.description || '',
      Character_Title: characterData.title || characterData.tagline || '',
      Category: characterData.category || 'General',
      Slug: characterData.slug || generateSlug(characterData.name),
      User_UID: requestBody.user_uid,
      Created_At: new Date().toISOString(),
      Status: 'Active',
      Is_Public: characterData.visibility === 'public' || false,
      Avatar_URL: characterData.avatar_url || '',
      Prompt: characterData.prompt || characterData.system_prompt || ''
    };

    // Add optional fields if they exist
    if (characterData.personality) fields.Personality = characterData.personality;
    if (characterData.voice_id) fields.Voice_ID = characterData.voice_id;
    if (characterData.tags && Array.isArray(characterData.tags)) {
      fields.Tags = characterData.tags.join(', ');
    }

    console.log('📤 Airtable fields:', fields);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: fields
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Character created in Airtable:', result.id);

    return {
      success: true,
      message: 'Character created successfully',
      character_id: result.id,
      character: {
        id: result.id,
        name: fields.Name,
        slug: fields.Slug,
        category: fields.Category,
        created_at: fields.Created_At
      }
    };

  } catch (error) {
    console.error('❌ Character creation error:', error);
    return {
      success: false,
      error: 'Failed to create character',
      details: error.message
    };
  }
}

// Generate URL-friendly slug from character name
function generateSlug(name) {
  if (!name) return 'unnamed-character';
  
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');     // Remove leading/trailing hyphens
}