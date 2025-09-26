// Async function to generate avatar in background
async function generateAvatarAsync(recordId, slug, avatarParams) {
  console.log('🎨 Background avatar generation started for:', slug);

  try {
    // Call the avatar generation function
    const generateUrl = `${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-generate-companion-avatar`;

    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(avatarParams)
    });

    if (response.ok) {
      const avatarResult = await response.json();

      if (avatarResult.success && avatarResult.imageUrl) {
        console.log('✅ Background avatar generated, updating record:', avatarResult.imageUrl);

        // Update the character record with the new avatar
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;
        const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN;

        const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${recordId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Avatar_URL: avatarResult.imageUrl
            }
          })
        });

        if (updateResponse.ok) {
          console.log('✅ Avatar updated successfully for:', slug);
        } else {
          console.error('❌ Failed to update avatar in Airtable:', updateResponse.status);
        }
      } else {
        console.log('⚠️ Background avatar generation failed:', avatarResult);
      }
    } else {
      console.error('❌ Background avatar generation HTTP error:', response.status);
    }
  } catch (error) {
    console.error('❌ Background avatar generation error:', error.message);
  }
}

// Helper function to escape strings for JSON safety
function escapeForJson(str) {
  if (!str) return str;
  return str.replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
}

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

  // Escape special characters for JSON safety
  return selectedGreeting.replace(/"/g, '\\"').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
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
  console.log('🎭 create-character function called (Selira version v1.5 - deployment trigger)');

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

  // Use Selira-specific environment variables only
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔑 Environment check (Selira):', {
    hasBaseId: !!AIRTABLE_BASE_ID,
    hasToken: !!AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.substring(0, 8) + '...' : 'none'
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Airtable credentials not found');
    console.error('   Missing: AIRTABLE_BASE_ID_SELIRA');
    console.error('   Missing: AIRTABLE_TOKEN_SELIRA');
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Airtable credentials not found',
        debug: 'Missing environment variables for Airtable access',
        hasBaseId: !!AIRTABLE_BASE_ID,
        hasToken: !!AIRTABLE_TOKEN,
        requiredVars: ['AIRTABLE_BASE_ID_SELIRA', 'AIRTABLE_TOKEN_SELIRA']
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

    // Get the user record ID for linking in Created_By field
    let userRecordId = null;
    if (userEmail) {
      try {
        console.log('🔍 Looking up user record for Created_By field...');
        const userLookupResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}="${userEmail}"`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (userLookupResponse.ok) {
          const userLookupData = await userLookupResponse.json();
          if (userLookupData.records && userLookupData.records.length > 0) {
            userRecordId = userLookupData.records[0].id;
            console.log('✅ Found user record ID:', userRecordId);
          }
        }
      } catch (error) {
        console.log('⚠️ Could not lookup user record:', error.message);
      }
    }

    // Generate slug from name (simple version without timestamp)
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Generate Character_URL
    const characterUrl = `https://selira.ai/chat.html?char=${slug}`;

    // Generate greeting based on character traits first
    const greetingText = generateGreeting(name, tags, extraInstructions);

    // Generate automatic description based on appearance and extra instructions
    const description = `A ${artStyle || 'realistic'} companion with ${ethnicity || 'diverse'} features, ${hairLength || 'medium'} ${hairColor || 'brown'} hair`;
    const fullDescription = extraInstructions ? `${description}\n\nExtra Instructions: ${extraInstructions}\n\nGreeting: ${greetingText}` : `${description}\n\nGreeting: ${greetingText}`;

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

    // Start with empty avatar URL - will be populated by async generation
    // Never use placeholder URLs for production
    let avatarUrlToUse = null;

    // Store avatar generation parameters for async processing
    const avatarGenerationNeeded = {
      name: name,
      sex: sex,
      description: description,
      artStyle: artStyle || 'realistic',
      tags: tags || []
    };

    // Skip synchronous avatar generation to avoid timeouts
    /*
    try {
      // Call the generate-companion-avatar function to create a custom avatar
      console.log('🎨 Generating custom avatar with Replicate...');

      const generateUrl = `${process.env.URL || 'https://selira.ai'}/.netlify/functions/selira-generate-companion-avatar`;

      const avatarPayload = {
        characterName: name,
        artStyle: artStyle || 'realistic',
        sex: sex || 'female',
        ethnicity: ethnicity || 'white',
        hairLength: hairLength || 'long',
        hairColor: hairColor || 'brown',
        tags: tags || []
      };

      console.log('📤 Calling selira-generate-companion-avatar with:', avatarPayload);

      // Create fetch with proper timeout implementation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      const avatarResponse = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(avatarPayload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (avatarResponse.ok) {
        const avatarResult = await avatarResponse.json();
        console.log('🎨 Avatar generation response:', avatarResult);

        if (avatarResult.success && avatarResult.imageUrl) {
          avatarUrlToUse = avatarResult.imageUrl;
          console.log('✅ Custom avatar generated:', avatarUrlToUse);
        } else {
          console.log('⚠️ Avatar generation returned success=false, using fallback');
          console.log('⚠️ Response details:', avatarResult);
        }
      } else {
        const errorText = await avatarResponse.text();
        console.log('⚠️ Avatar generation failed with HTTP', avatarResponse.status);
        console.log('⚠️ Error response:', errorText);
      }
    } catch (error) {
      console.log('⚠️ Avatar generation error:', error.message, ', using fallback');
    }
    */

    // Greeting is now stored in description, no need to generate again

    // Determine if character should be unfiltered based on tags
    const unfilteredTags = ['Seductive', 'Yandere', 'Ex', 'Boss', 'Monster'];
    const isUnfiltered = tags && tags.some(tag => unfilteredTags.includes(tag));

    // Prepare character data with all required fields (escape strings for safety)
    const characterData = {
      Name: escapeForJson(name),
      Character_Description: escapeForJson(fullDescription),
      Character_Title: '', // Leave empty as requested
      Slug: slug, // Slug should be URL-safe, no escaping needed
      Character_URL: characterUrl, // URL should be safe
      Prompt: escapeForJson(fullPrompt),
      // Greeting is stored in Character_Description
      Tags: Array.isArray(tags) && tags.length > 0 ? tags : [],
      Visibility: visibility || 'public',
      Category: 'romance', // Set appropriate category for new companions instead of default
      companion_type: artStyle || 'realistic',
      sex: sex || 'female',
      ethnicity: ethnicity || 'white',
      hair_length: hairLength || 'long',
      hair_color: hairColor || 'brown',
      // Avatar_URL will be added by async generation - don't create empty field
      is_unfiltered: isUnfiltered
      // chats and rating fields don't exist in Airtable - removed
    };

    // Add Created_By field only if we have a user record ID (linked record field)
    if (userRecordId) {
      characterData.Created_By = [userRecordId];
    }

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

    // Now update the Users table to link this character to the user
    if (userRecordId) {
      try {
        console.log('🔗 Linking character to user in Users table...');

        // Get the current user record to find existing characters
        const userResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${userRecordId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const existingCharacters = userData.fields.Characters || [];

          // Add the new character ID to the list
          const updatedCharacters = [...existingCharacters, result.id];

          // Update the user record with the new character list
          const updateUserResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${userRecordId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                Characters: updatedCharacters
              }
            })
          });

          if (updateUserResponse.ok) {
            console.log('✅ Successfully linked character to user');
          } else {
            console.log('⚠️ Failed to update user record with character link');
          }
        }
      } catch (error) {
        console.log('⚠️ Error linking character to user:', error.message);
        // Don't fail the whole operation if user linking fails
      }
    }

    // TODO: Re-enable async avatar generation after fixing appearance error
    // Trigger async avatar generation after character is created
    console.log('🎨 Skipping async avatar generation temporarily...');

    // Generate title for avatar generation
    // const title = `${ethnicity || 'Beautiful'} ${artStyle || 'Realistic'} Companion`;

    // Prepare parameters for avatar generation API
    // const avatarApiParams = {
    //   characterName: name,
    //   characterTitle: title,
    //   category: 'Romance'
    // };

    // generateAvatarAsync(result.id, result.fields.Slug, avatarApiParams);

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
          greeting: greetingText, // Extract from description or use generated
          title: result.fields.Character_Title,
          artStyle: result.fields.companion_type,
          sex: result.fields.sex,
          ethnicity: result.fields.ethnicity,
          hairLength: result.fields.hair_length,
          hairColor: result.fields.hair_color,
          tags: result.fields.Tags,
          avatarUrl: result.fields.Avatar_URL || null, // Will be populated by async generation
          isUnfiltered: result.fields.is_unfiltered,
          visibility: result.fields.Visibility,
          chats: '0', // Default for new characters
          rating: '5.0' // Default for new characters
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