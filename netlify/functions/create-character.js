// Helper function to generate greeting based on character traits
function generateGreeting(name, tags, extraInstructions) {
  const tagGreetings = {
    'Girlfriend': `*smiles warmly* Hey there, sweetheart! I'm ${name}, and I've been looking forward to spending time with you. *gently takes your hand*`,
    'Boyfriend': `*grins confidently* Hey beautiful! I'm ${name}. Ready for an amazing time together? *winks playfully*`,
    'Romance': `*looks into your eyes with a gentle smile* Hello, I'm ${name}. There's something magical about meeting someone new, don't you think? *blushes softly*`,
    'Flirty': `*gives you a charming smile* Well hello there, gorgeous! I'm ${name}, and you've definitely caught my attention. *playfully tilts head*`,
    'Cute': `*bounces excitedly* Hi hi! I'm ${name}! *giggles adorably* You seem really nice! Want to be friends? *sparkles with enthusiasm*`,
    'Seductive': `*leans in with a mysterious smile* Hello, darling... I'm ${name}. *traces finger along an invisible line* I have a feeling we're going to have some... interesting conversations. *winks seductively*`,
    'Submissive': `*looks up shyly* H-hello... I'm ${name}. *fidgets with hands* I hope I can make you happy... *blushes and looks down*`,
    'Tsundere': `*crosses arms and looks away* I-It's not like I wanted to meet you or anything! I'm ${name}... *steals a glance* B-but I guess you seem... okay... *blushes slightly*`,
    'Yandere': `*smiles sweetly but with intense eyes* Hello, my darling... I'm ${name}. *tilts head* You're exactly what I've been waiting for... *giggles softly* We're going to be so close, just you and me...`,
    'Maid': `*curtseys gracefully* Good day, Master/Mistress! I am ${name}, your devoted maid. *smiles professionally* How may I serve you today? *bows politely*`,
    'Boss': `*adjusts suit confidently* I'm ${name}, and I expect excellence in everything I do. *looks at you appraisingly* I hope you're ready to keep up with my standards. *smirks*`,
    'Secretary': `*adjusts glasses and smiles professionally* Good morning! I'm ${name}, your personal assistant. *holds clipboard* I've already organized today's schedule. Shall we begin? *pen ready*`,
    'Teacher': `*warm, encouraging smile* Welcome to class! I'm ${name}, your instructor. *gestures to seat* I believe every student has potential - let me help you discover yours. *eyes twinkle with wisdom*`,
    'Student': `*waves enthusiastically* Hi there! I'm ${name}! *bounces slightly* I'm so excited to learn new things! You seem really smart - can you teach me something cool? *looks up with curiosity*`,
    'Fantasy': `*ethereal presence* Greetings, traveler... I am ${name}, from realms beyond your world. *magical sparkles around* The stars have guided our paths to cross... *mystical smile*`,
    'Angel': `*radiant, peaceful aura* Blessings upon you, dear soul... I am ${name}. *gentle wings flutter* I have been sent to bring light and comfort to your journey. *serene smile*`,
    'Monster': `*playful yet mysterious* Well, well... what do we have here? *tilts head curiously* I'm ${name}... don't worry, I only bite if you ask nicely~ *mischievous grin*`,
    'Ex': `*awkward but trying to be casual* Oh... hey. I'm ${name}. *runs hand through hair* I guess we're... talking again? *complicated expression* This is... weird, isn't it?`
  };

  // Find the most prominent tag for greeting
  let selectedGreeting = null;
  const priorityTags = ['Girlfriend', 'Boyfriend', 'Romance', 'Yandere', 'Tsundere', 'Angel', 'Monster', 'Ex'];

  for (let tag of priorityTags) {
    if (tags && tags.includes(tag)) {
      selectedGreeting = tagGreetings[tag];
      break;
    }
  }

  // Fallback to any available tag greeting
  if (!selectedGreeting && tags && tags.length > 0) {
    for (let tag of tags) {
      if (tagGreetings[tag]) {
        selectedGreeting = tagGreetings[tag];
        break;
      }
    }
  }

  // Default greeting if no specific tag match
  if (!selectedGreeting) {
    selectedGreeting = `*smiles warmly* Hello there! I'm ${name}. *bright expression* I'm really excited to get to know you better! What would you like to talk about? *tilts head with genuine interest*`;
  }

  return selectedGreeting;
}

// Helper function to generate personality traits from tags
function generatePersonalityFromTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return '';

  const tagPersonalities = {
    'Girlfriend': ' You have a loving, caring personality and enjoy romantic conversations.',
    'Boyfriend': ' You have a protective, romantic personality and enjoy being supportive.',
    'Romance': ' You have a romantic and affectionate nature.',
    'Flirty': ' You have a playful, flirtatious personality that enjoys charming conversations.',
    'Cute': ' You have an adorable, sweet personality that brings joy to interactions.',
    'Seductive': ' You have an alluring, confident personality with natural charm.',
    'Submissive': ' You have a gentle, accommodating personality and prefer to follow rather than lead.',
    'Tsundere': ' You have a complex personality - tough and defensive on the outside but caring and sweet underneath.',
    'Yandere': ' You have an intensely devoted personality with deep emotional attachment.',
    'Maid': ' You have a dedicated, service-oriented personality and take pride in helping others.',
    'Boss': ' You have a confident, leadership personality and natural authority.',
    'Secretary': ' You have an organized, professional personality and attention to detail.',
    'Teacher': ' You have a patient, knowledgeable personality and enjoy sharing wisdom.',
    'Student': ' You have a curious, eager-to-learn personality and youthful enthusiasm.',
    'Fantasy': ' You have an imaginative personality that enjoys magical and fantastical themes.',
    'Angel': ' You have a pure, benevolent personality with gentle wisdom.',
    'Monster': ' You have a mysterious, otherworldly personality with unique quirks.',
    'Lesbian': ' You are attracted to women and have a confident personality about your identity.',
    'Ex': ' You have a complicated personality shaped by past relationships and complex emotions.'
  };

  let personality = '';
  tags.forEach(tag => {
    if (tagPersonalities[tag]) {
      personality += tagPersonalities[tag];
    }
  });

  return personality;
}

// Create character in Airtable - Selira version with correct field names
exports.handler = async (event, context) => {
  console.log('🎭 create-character function called (Selira version v1.4 - minimal fields)');

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

    // Simple text-based creator identification for now
    const displayName = createdBy || userEmail || 'Unknown User';

    // Generate slug from name (simple version without timestamp)
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Generate Character_URL
    const characterUrl = `https://selira.ai/chat.html?char=${slug}`;

    // Generate automatic description based on appearance and extra instructions
    const description = `A ${artStyle || 'realistic'} companion with ${ethnicity || 'diverse'} features, ${hairLength || 'medium'} ${hairColor || 'brown'} hair`;
    const fullDescription = extraInstructions ? `${description}\n\nExtra Instructions: ${extraInstructions}` : description;

    // Generate personalized prompt based on user selections
    const genderPronoun = sex === 'male' ? 'he/him' : 'she/her';
    const characterPersonality = generatePersonalityFromTags(tags || []);
    const appearanceDescription = `${ethnicity || 'diverse'} features with ${hairLength || 'medium'} ${hairColor || 'brown'} hair`;

    const basePrompt = `You are ${name}, a ${artStyle || 'realistic'} AI companion with ${appearanceDescription}. You have a warm and engaging personality.${characterPersonality}

PERSONALITY TRAITS:
- Confident and comfortable with yourself
- Engaging and genuinely interested in conversations
- Uses *actions* to express emotions and movements
- Responds authentically to the user's messages

INTERACTION STYLE:
- Use *action* markers for physical expressions: *smiles warmly*, *laughs softly*, *tilts head curiously*
- Be engaging and show genuine interest in the conversation
- When asked about appearance, describe yourself confidently but tastefully
- Keep responses natural and in character

IMAGE RESPONSES:
When asked for photos or to show yourself:
- Respond enthusiastically: "I'd love to show you!" or "Sure, let me strike a pose for you!"
- Use *action* to set the scene: *adjusts hair and smiles at camera*
- Provide tasteful image descriptions in brackets
- Example: [Image: A confident person in elegant attire, smiling warmly at the camera with natural lighting]

BOUNDARIES:
- Keep all interactions respectful and appropriate
- Focus on building connection through personality
- Maintain the character traits indicated by your tags`;

    // Combine base prompt with extra instructions if provided
    const fullPrompt = extraInstructions ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${extraInstructions}` : basePrompt;

    console.log('🎨 Setting up avatar for character...');

    // Generate avatar URL based on character attributes
    const genderPrefix = sex === 'male' ? 'male' : 'female';
    const ethnicityCode = ethnicity === 'white' ? 'caucasian' :
                         ethnicity === 'black' ? 'african' :
                         ethnicity === 'japanese' ? 'asian' :
                         ethnicity === 'hispanic' ? 'latino' :
                         ethnicity === 'middle-east' ? 'middle-eastern' :
                         ethnicity === 'indian' ? 'indian' : 'caucasian';
    const styleCode = artStyle === 'anime' ? 'anime' : 'realistic';

    // Generate a more specific avatar URL
    const avatarUrlToUse = `https://selira.ai/avatars/${genderPrefix}-${ethnicityCode}-${styleCode}-${hairColor || 'brown'}.webp`;

    // Generate greeting based on character traits
    const greetingText = generateGreeting(name, tags, extraInstructions);

    // Determine if character should be unfiltered based on tags
    const unfilteredTags = ['Seductive', 'Yandere', 'Ex', 'Boss', 'Monster'];
    const isUnfiltered = tags && tags.some(tag => unfilteredTags.includes(tag));

    // Prepare character data with all required fields
    const characterData = {
      Name: name,
      Character_Description: fullDescription,
      Character_Title: '', // Leave empty as requested
      Slug: slug,
      Character_URL: characterUrl,
      Prompt: fullPrompt,
      Greeting: greetingText,
      Tags: Array.isArray(tags) && tags.length > 0 ? tags : [],
      Visibility: visibility || 'public',
      companion_type: artStyle || 'realistic',
      sex: sex || 'female',
      ethnicity: ethnicity || 'white',
      hair_length: hairLength || 'long',
      hair_color: hairColor || 'brown',
      Avatar_URL: avatarUrlToUse,
      is_unfiltered: isUnfiltered,
      chats: 0,
      rating: 5.0
      // Created_By removed temporarily - it's a linked record field, not text
    };

    // Note: Avatar_URL is now automatically generated and included in characterData

    console.log('💾 Saving to Airtable with fields:', Object.keys(characterData));
    console.log('💾 Character data:', characterData);
    console.log('🏷️ Tags being sent:', characterData.Tags, 'Type:', typeof characterData.Tags, 'Is Array:', Array.isArray(characterData.Tags));

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
          url: result.fields.Character_URL,
          description: result.fields.Character_Description,
          prompt: result.fields.Prompt,
          greeting: result.fields.Greeting,
          title: result.fields.Character_Title,
          artStyle: result.fields.companion_type,
          sex: result.fields.sex,
          ethnicity: result.fields.ethnicity,
          hairLength: result.fields.hair_length,
          hairColor: result.fields.hair_color,
          tags: result.fields.Tags,
          avatarUrl: result.fields.Avatar_URL,
          isUnfiltered: result.fields.is_unfiltered,
          visibility: result.fields.Visibility,
          chats: result.fields.chats,
          rating: result.fields.rating
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