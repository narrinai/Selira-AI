// Generate rich storytelling descriptions for companions using OpenAI
const fetch = require('node-fetch');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

exports.handler = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { characterId, traits, regenerate } = JSON.parse(event.body);

    if (!characterId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'characterId required' })
      };
    }

    console.log('📝 Generating description for character:', characterId);

    // Fetch character data from Airtable
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${characterId}`;
    const charResponse = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!charResponse.ok) {
      throw new Error('Failed to fetch character from Airtable');
    }

    const charData = await charResponse.json();
    const character = charData.fields;

    // Build prompt based on character traits
    const name = character.Name || 'Unknown';
    const category = character.Category || 'General';
    const sex = character.sex || character.Sex || 'female';
    const ethnicity = character.ethnicity || character.Ethnicity || 'white';
    const hairLength = character.hair_length || character.Hair_Length || 'long';
    const hairColor = character.hair_color || character.Hair_Color || 'brown';
    const age = character.age || character.Age || '25';
    const bodyType = character.body_type || character.Body_Type || 'athletic';
    const companionType = character.companion_type || character.Companion_Type || 'realistic';

    // Create storytelling prompt
    const systemPrompt = `You are a creative writer specializing in character backstories and descriptions. Create engaging, immersive character descriptions that tell a story and make the reader curious to interact with the character.

Guidelines:
- Write 3-5 sentences (100-150 words max)
- Focus on WHO they are, their personality, background, and what makes them unique
- Include subtle hints about their desires, fears, or secrets
- Make it engaging and mysterious - leave room for discovery
- Use vivid, sensory language
- Match the tone to the category (romance = intimate/flirty, fantasy = epic/mysterious, etc)
- DO NOT include greetings, instructions, or meta information
- Write in third person narrative style`;

    const userPrompt = `Create a compelling character description for:

Name: ${name}
Category: ${category}
Gender: ${sex}
Ethnicity: ${ethnicity}
Hair: ${hairLength}, ${hairColor}
Age: ${age}
Body Type: ${bodyType}
Style: ${companionType}

Make it engaging, mysterious, and make readers want to chat with ${name}. Focus on personality, background, and what makes them unique.`;

    // Generate description with OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 250
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('❌ OpenAI error:', error);
      throw new Error('Failed to generate description');
    }

    const openaiData = await openaiResponse.json();
    const generatedDescription = openaiData.choices[0].message.content.trim();

    console.log('✅ Generated description:', generatedDescription);

    // Update Airtable with new description (optional - only if regenerate=true)
    if (regenerate) {
      const updateResponse = await fetch(airtableUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Character_Description: generatedDescription
          }
        })
      });

      if (!updateResponse.ok) {
        console.error('❌ Failed to update Airtable');
      } else {
        console.log('💾 Updated character description in Airtable');
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        description: generatedDescription,
        characterId: characterId
      })
    };

  } catch (error) {
    console.error('❌ Error generating description:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
