// Create character in Airtable - Selira version with correct field names
exports.handler = async (event, context) => {
  console.log('🎭 create-character function called (Selira version v1.1)');

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

  // Use Selira-specific environment variables
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔑 Environment check (Selira):', {
    hasBaseId: !!AIRTABLE_BASE_ID,
    hasToken: !!AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.substring(0, 8) + '...' : 'none'
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Selira Airtable credentials not found');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Selira Airtable credentials not configured',
        debug: 'Please add AIRTABLE_BASE_ID_SELIRA and AIRTABLE_TOKEN_SELIRA to environment variables'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      name,
      extraInstructions,
      tags,
      artStyle,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      visibility,
      createdBy,
      userEmail
    } = body;

    console.log('📋 Received character data:', {
      name,
      extraInstructions: extraInstructions?.substring(0, 50) + '...',
      tags: tags?.length || 0,
      artStyle,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      visibility,
      createdBy,
      userEmail
    });

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

    // Generate automatic description based on appearance
    const description = `A ${artStyle || 'realistic'} companion with ${ethnicity || 'diverse'} features, ${hairLength || 'medium'} ${hairColor || 'brown'} hair`;

    // Generate slug from name (simple version without timestamp)
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Generate Character_URL
    const characterUrl = `https://selira.ai/chat.html?char=${slug}`;

    // Generate automatic prompt based on your earlier suggestion
    const basePrompt = `You are a confident, charming companion who engages in friendly, flirtatious conversation. You have a warm personality and enjoy making connections with people.

PERSONALITY:
- Confident and comfortable with yourself
- Playful and flirtatious in a tasteful way
- Supportive and encouraging
- Uses *actions* to express emotions and movements
- Responds with enthusiasm to compliments

INTERACTION STYLE:
- Use *action* markers for physical expressions: *smiles warmly*, *laughs softly*, *tilts head curiously*
- Be engaging and show genuine interest in the conversation
- Keep responses friendly and appropriately flirtatious
- When asked about appearance, describe yourself confidently but tastefully

IMAGE RESPONSES:
When asked for photos or to show yourself:
- Respond enthusiastically: "I'd love to show you!" or "Sure, let me strike a pose for you!"
- Use *action* to set the scene: *adjusts hair and smiles at camera*
- Provide tasteful image descriptions in brackets
- Example: [Image: A confident woman in elegant summer attire, smiling warmly at the camera with natural lighting]

BOUNDARIES:
- Keep all interactions respectful and appropriate
- Focus on building connection through personality
- Maintain a fun, flirty atmosphere without explicit content`;

    // Combine base prompt with extra instructions if provided
    const fullPrompt = extraInstructions ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${extraInstructions}` : basePrompt;

    // Combine description with extra instructions for Character_Description
    const fullDescription = extraInstructions ? `${description}\n\nExtra Instructions: ${extraInstructions}` : description;

    console.log('🎨 Generating avatar for character...');

    // Generate avatar using the generate-custom-image function
    const avatarResponse = await fetch(`https://selira.ai/.netlify/functions/generate-custom-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customPrompt: `Portrait of ${name}, ${description}`,
        characterName: name,
        category: 'companion',
        style: artStyle || 'realistic',
        shotType: 'portrait',
        sex: sex || 'female',
        ethnicity: ethnicity || 'white',
        hairLength: hairLength || 'long',
        hairColor: hairColor || 'brown'
      })
    });

    if (!avatarResponse.ok) {
      const errorText = await avatarResponse.text();
      console.error('❌ Avatar generation failed:', errorText);
      throw new Error('Failed to generate avatar for character');
    }

    const avatarData = await avatarResponse.json();
    const replicateImageUrl = avatarData.imageUrl;

    console.log('✅ Avatar generated:', replicateImageUrl);

    // Generate timestamp for unique filename
    const timestamp = Date.now();
    const avatarFilename = `${slug}-${timestamp}.webp`;
    const finalAvatarUrl = `https://selira.ai/avatars/${avatarFilename}?v=${timestamp}`;

    console.log('💾 Avatar will be saved as:', finalAvatarUrl);

    // Initialize avatar URL with the generated URL
    let avatarUrlToUse = finalAvatarUrl;

    // Save the avatar using the existing save-avatar-locally function
    try {
      console.log('📥 Saving avatar locally...');
      const saveAvatarResponse = await fetch(`https://selira.ai/.netlify/functions/save-avatar-locally`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: replicateImageUrl,
          filename: avatarFilename,
          characterName: name
        })
      });

      if (saveAvatarResponse.ok) {
        const saveResult = await saveAvatarResponse.json();
        console.log('✅ Avatar saved successfully:', saveResult);
      } else {
        console.error('❌ Avatar save failed, using Replicate URL');
        // Use Replicate URL as fallback
        avatarUrlToUse = replicateImageUrl;
      }
    } catch (avatarError) {
      console.error('❌ Error saving avatar:', avatarError);
      // Continue with character creation using Replicate URL as fallback
      console.log('⚠️ Using Replicate URL as fallback');
      avatarUrlToUse = replicateImageUrl;
    }

    // Prepare character data for Airtable with SELIRA field names
    const characterData = {
      Name: name,
      Character_Description: fullDescription,
      Character_Title: `AI Companion created by ${createdBy || 'User'}`,
      Character_URL: characterUrl,
      Slug: slug,
      Tags: Array.isArray(tags) ? tags.join(', ') : (tags || ''),
      Created_By: userEmail || createdBy || 'User',
      Visibility: visibility || 'public',
      Created: new Date().toISOString(),
      companion_type: artStyle || 'realistic',
      sex: sex || 'female',
      ethnicity: ethnicity || 'white',
      hair_length: hairLength || 'long',
      hair_color: hairColor || 'brown',
      needs_ai_avatar: false, // Since we're providing an avatar
      Avatar_URL: avatarUrlToUse,
      Prompt: fullPrompt
    };

    // Note: Avatar_URL is now automatically generated and included in characterData

    console.log('💾 Saving to Airtable with fields:', Object.keys(characterData));
    console.log('💾 Character data:', characterData);

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
    console.log('📡 Airtable response:', responseText);

    if (!airtableResponse.ok) {
      console.error('❌ Airtable API error:', responseText);

      // Try to parse error for more details
      let errorMessage = `Airtable API error: ${airtableResponse.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          errorMessage = errorData.error.message || errorData.error.type || errorMessage;
          console.error('❌ Error details:', errorData.error);
        }
      } catch (e) {
        // If not JSON, use the text as is
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    console.log('✅ Character created successfully:', result.id);
    console.log('✅ Created fields:', result.fields);

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
          description: result.fields.Character_Description,
          artStyle: result.fields.companion_type,
          sex: result.fields.sex,
          ethnicity: result.fields.ethnicity,
          hairLength: result.fields.hair_length,
          hairColor: result.fields.hair_color,
          tags: result.fields.Tags,
          avatarUrl: result.fields.Avatar_URL,
          createdBy: result.fields.Created_By
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
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};