// Clean, minimal create-companion function to bypass undefined variable issues
// This function strips out all potentially problematic code and focuses on core functionality

exports.handler = async (event, context) => {
  console.log('🎭 Clean create-companion function v1.0 - minimal version');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Environment variables
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Airtable credentials not found' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      name,
      extraInstructions = '',
      tags = [],
      artStyle = 'realistic',
      sex = 'female',
      ethnicity = 'white',
      hairLength = 'long',
      hairColor = 'brown',
      visibility = 'public',
      createdBy = 'User',
      userEmail = ''
    } = body;

    if (!name) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Name is required' })
      };
    }

    // Generate slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Generate Character_URL
    const characterUrl = `https://selira.ai/chat.html?char=${slug}`;

    // Simple greeting
    const greetingText = `Hello! I'm ${name}. Nice to meet you!`;

    // Simple description
    const description = `A ${artStyle} companion with ${ethnicity} features and ${hairLength} ${hairColor} hair.`;
    const fullDescription = extraInstructions ?
      `${description}\n\nExtra Instructions: ${extraInstructions}\n\nGreeting: ${greetingText}` :
      `${description}\n\nGreeting: ${greetingText}`;

    // Simple prompt
    const basePrompt = `You are ${name}, a ${artStyle} AI companion. You are friendly and engaging.

PERSONALITY:
- Warm and welcoming
- Good conversationalist
- Uses *actions* for expressions

INTERACTION STYLE:
- Use *action* markers: *smiles*, *laughs*
- Be natural and authentic
- Keep conversations interesting`;

    const fullPrompt = extraInstructions ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${extraInstructions}` : basePrompt;

    // Prepare character data - MINIMAL FIELDS ONLY
    const characterData = {
      Name: name,
      Character_Description: fullDescription,
      Character_Title: '',
      Slug: slug,
      Character_URL: characterUrl,
      Prompt: fullPrompt,
      Tags: Array.isArray(tags) ? tags : [],
      Visibility: visibility,
      Category: 'romance',
      companion_type: artStyle,
      sex: sex,
      ethnicity: ethnicity,
      hair_length: hairLength,
      hair_color: hairColor,
      is_unfiltered: false
    };

    console.log('💾 Creating character with minimal data:', Object.keys(characterData));

    // Create character in Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: characterData
      })
    });

    const responseText = await airtableResponse.text();
    console.log('📡 Airtable response status:', airtableResponse.status);

    if (!airtableResponse.ok) {
      console.error('❌ Airtable API error:', responseText);
      throw new Error(`Airtable API error: ${airtableResponse.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Character created successfully:', result.id);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        character: {
          id: result.id,
          name: result.fields.Name,
          slug: result.fields.Slug,
          url: result.fields.Character_URL,
          description: result.fields.Character_Description,
          prompt: result.fields.Prompt,
          greeting: greetingText,
          title: result.fields.Character_Title,
          artStyle: result.fields.companion_type,
          sex: result.fields.sex,
          ethnicity: result.fields.ethnicity,
          hairLength: result.fields.hair_length,
          hairColor: result.fields.hair_color,
          tags: result.fields.Tags,
          avatarUrl: null, // No avatar generation for now
          isUnfiltered: result.fields.is_unfiltered,
          visibility: result.fields.Visibility,
          chats: '0',
          rating: '5.0'
        }
      })
    };

  } catch (error) {
    console.error('❌ Create character error:', error);
    console.error('❌ Error stack:', error.stack);

    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Character creation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};