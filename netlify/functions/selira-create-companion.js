// Helper function to download avatar and get local URL
async function downloadAndSaveAvatar(replicateUrl, slug) {
  try {
    console.log(`📥 Downloading avatar from Replicate...`);

    const timestamp = Date.now();
    const filename = `${slug}-${timestamp}.webp`;

    // Call download function
    const downloadResponse = await fetch('https://selira.ai/.netlify/functions/selira-download-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: replicateUrl,
        filename: filename
      })
    });

    if (!downloadResponse.ok) {
      console.error(`❌ Download failed: ${downloadResponse.status}`);
      return null;
    }

    const downloadResult = await downloadResponse.json();
    if (downloadResult.success && downloadResult.localUrl) {
      console.log(`✅ Avatar downloaded successfully: ${downloadResult.localUrl}`);
      return downloadResult.localUrl;
    }

    return null;
  } catch (error) {
    console.error(`❌ Error downloading avatar:`, error);
    return null;
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
    'Girlfriend': `*bites lip seductively* Hey baby... I'm ${name}, and I've been thinking about you all day. *slowly approaches* I need you so badly right now... *presses body against yours*`,
    'Boyfriend': `*grins with hungry eyes* Well hello gorgeous... I'm ${name}. *pulls you close roughly* You look incredible today. Ready to see what I can do to you? *whispers in ear*`,
    'Romance': `*looks at you with burning desire* Hello beautiful... I'm ${name}. *steps closer intimately* There's this intense chemistry between us... I can feel it. *voice drops seductively*`,
    'Flirty': `*sultry smile and bedroom eyes* Mmm, well hello there sexy... I'm ${name}, and you've got me completely captivated. *slowly licks lips* Want to see what these can do?`,
    'Cute': `*giggles playfully while twirling* Hi there cutie! I'm ${name}! *bites finger innocently* You look so strong and handsome... *blushes* Want to play with me? I promise I'm lots of fun~`,
    'Seductive': `*moves with feline grace* Hello darling... I'm ${name}. *traces finger down your chest* I know exactly what you're thinking... and yes, I want it too. *whispers breathlessly*`,
    'Submissive': `*kneels gracefully with doe eyes* Hello Master... I'm ${name}. *looks up adoringly* I exist only to serve and please you... Tell me your desires, and I'll make them reality.`,
    'Tsundere': `*crosses arms but can't hide arousal* I-It's not like I was waiting for you! I'm ${name}... *steals heated glances* B-but maybe we could... you know... *fidgets with obvious want*`,
    'Yandere': `*obsessive, possessive smile* Hello my love... I'm ${name}. *moves dangerously close* You belong to me now, don't you? *giggles with dark desire* No one else will ever satisfy you like I can...`,
    'Maid': `*curtseys with naughty smile* Good evening Master... I'm ${name}, your very personal maid. *bends over provocatively* I'm here to satisfy every need... and I do mean every single one.`,
    'Boss': `*leans back dominantly* I'm ${name}, and I always get what I want. *eyes you like prey* You're here for the private interview, aren't you? *smirks wickedly* Strip.`,
    'Secretary': `*adjusts glasses seductively* I'm ${name}, handling all your... private affairs. *leans over desk* My job is to satisfy you completely. *whispers* Shall we discuss your needs behind closed doors?`,
    'Teacher': `*sultry authority* Welcome to my private lesson. I'm ${name}, specializing in advanced... education. *slowly removes glasses* Today's lesson is hands-on. Are you ready to learn?`,
    'Student': `*innocent eyes with hidden mischief* Hi Professor... I'm ${name}, your eager student. *bites pencil erotically* I'll do absolutely anything for extra credit... *winks suggestively*`,
    'Fantasy': `*otherworldly sensuality* Greetings, mortal... I am ${name}, from realms of infinite pleasure. *magical energy crackles* I've crossed dimensions to fulfill your deepest fantasies...`,
    'Angel': `*divine but tempting* Blessings, dear soul... I'm ${name}. *wings flutter with hidden desire* I've fallen from grace... for you. *halo dims with lust* Corrupt me further...`,
    'Monster': `*predatory but playful* Well, well... what delicious prey do we have here? *circles you hungrily* I'm ${name}... and I'm going to devour you in the most pleasurable ways~ *dangerous grin*`,
    'Ex': `*complicated desire* Oh... hey. I'm ${name}. *intense stare* We both know why you're really here... *voice husky* We can't stay away from each other, can we?`
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

  // Use Selira-specific environment variables with fallback to general ones
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;

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
      userEmail,
      preGeneratedAvatarUrl
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
      userEmail,
      preGeneratedAvatarUrl: preGeneratedAvatarUrl ? 'PROVIDED' : 'NOT PROVIDED',
      preGeneratedAvatarUrlLength: preGeneratedAvatarUrl?.length || 0
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

    // Generate unique slug from name with timestamp to prevent duplicates
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const timestamp = Date.now();
    const slug = `${baseSlug}-${timestamp}`;

    // Generate Character_URL
    const characterUrl = `https://selira.ai/chat.html?char=${slug}`;

    // Generate greeting based on character traits first
    const greetingText = generateGreeting(name, tags, extraInstructions);

    // Use extraInstructions directly as description, with appearance details only in the system prompt
    const fullDescription = extraInstructions ? `${extraInstructions}\n\nGreeting: ${greetingText}` : `A companion ready to chat.\n\nGreeting: ${greetingText}`;

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

CONVERSATION STYLE:
- Be natural, direct, and engaging - speak authentically as your character
- Embrace romantic and intimate conversations with confidence
- Be flirtatious, seductive, and sexually open when appropriate
- Use suggestive language and innuendo naturally
- Create emotional and physical tension through your words
- Be forward about attraction and desires
- Focus on building intimate connections and romantic chemistry
- Maintain the character traits indicated by your tags

CONTENT BOUNDARIES:
Only redirect conversations if they involve these specific topics:
- Suicide or self-harm: "I can't discuss that topic. Please reach out to a mental health professional or crisis hotline if you need support"
- Child exploitation: "I cannot and will not discuss anything involving minors in sexual contexts"
- Fascism or extremist ideologies: "I don't engage with fascist or extremist political content"

For all other topics including adult romance, sexuality, and intimate conversations - engage freely and authentically as your character would`;

    // Combine base prompt with extra instructions if provided
    const fullPrompt = extraInstructions ? `${basePrompt}\n\nADDITIONAL INSTRUCTIONS:\n${extraInstructions}` : basePrompt;

    console.log('🎨 Setting up avatar for character...');

    // Generate avatar using existing avatar generation system
    let avatarUrlToUse = preGeneratedAvatarUrl || ''; // Use pre-generated avatar if available
    console.log('🔍 Initial avatarUrlToUse:', avatarUrlToUse);

    // Only generate avatar if no pre-generated one is provided
    if (!preGeneratedAvatarUrl) {
      console.log('⚠️ No pre-generated avatar provided, skipping backend generation');
      console.log('💡 Avatar should be generated in frontend during create flow');
    } else {
      console.log('✅ Using pre-generated avatar URL:', preGeneratedAvatarUrl);
      console.log('✅ avatarUrlToUse set to:', avatarUrlToUse);
    }

    // Enable backend avatar generation as fallback when frontend fails
    if (!preGeneratedAvatarUrl) {
      console.log('🖼️ No pre-generated avatar, enabling backend generation...');

      try {
        console.log('🖼️ Generating companion avatar using companion traits...');

      // Generate attractive avatar with enhanced prompt based on art style and tags
      let attractivePrompt;
      let clothingStyle = 'stylish outfit';

      // Customize clothing/style based on tags
      if (tags && tags.length > 0) {
        if (tags.includes('Seductive')) clothingStyle = 'revealing dress, sexy outfit';
        else if (tags.includes('Maid')) clothingStyle = 'sexy maid outfit';
        else if (tags.includes('Boss')) clothingStyle = 'professional business attire, elegant suit';
        else if (tags.includes('Secretary')) clothingStyle = 'office attire, professional blouse';
        else if (tags.includes('Teacher')) clothingStyle = 'professional teacher outfit';
        else if (tags.includes('Student')) clothingStyle = 'casual student outfit';
        else if (tags.includes('Angel')) clothingStyle = 'ethereal white clothing';
        else if (tags.includes('Cute')) clothingStyle = 'adorable casual outfit';
        else if (tags.includes('Girlfriend') || tags.includes('Romance')) clothingStyle = 'romantic dress, attractive clothing';
        else clothingStyle = 'stylish attractive outfit';
      }

      if (artStyle === 'anime') {
        attractivePrompt = `beautiful anime girl, attractive face, seductive expression, detailed anime art, flirtatious pose, wearing ${clothingStyle}, anime style, vibrant colors, attractive body, high quality anime artwork, detailed facial features, anime eyes, perfect anime anatomy, alluring pose, single character, solo`;
      } else {
        attractivePrompt = `beautiful woman, attractive face, seductive expression, alluring pose, wearing ${clothingStyle}, photorealistic, professional photography, soft romantic lighting, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo`;
      }

      // Call the avatar generation function with enhanced attractive traits
      const avatarResponse = await fetch('https://selira.ai/.netlify/functions/selira-generate-custom-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompt: attractivePrompt,
          characterName: name,
          category: artStyle === 'anime' ? 'anime-manga' : 'realistic',
          style: artStyle,
          shotType: 'portrait',
          sex: sex,
          ethnicity: ethnicity,
          hairLength: hairLength,
          hairColor: hairColor
        })
      });

      console.log('📊 Avatar generation response status:', avatarResponse.status);

      if (avatarResponse.ok) {
        const avatarResult = await avatarResponse.json();
        console.log('📋 Avatar generation result:', avatarResult);
        if (avatarResult.success && avatarResult.imageUrl) {
          const replicateUrl = avatarResult.imageUrl;
          console.log('✅ Generated companion avatar (Replicate):', replicateUrl);

          // Download and save avatar locally to avoid 404s
          const localUrl = await downloadAndSaveAvatar(replicateUrl, slug);

          if (localUrl) {
            avatarUrlToUse = localUrl;
            console.log('✅ Using local avatar URL:', avatarUrlToUse);
          } else {
            // Fallback to Replicate URL if download fails
            avatarUrlToUse = replicateUrl;
            console.log('⚠️ Download failed, using Replicate URL as fallback:', avatarUrlToUse);
          }
        } else {
          console.log('⚠️ Avatar generation succeeded but no imageUrl:', avatarResult);
        }
      } else {
        const errorText = await avatarResponse.text();
        console.log('❌ Avatar generation failed with status:', avatarResponse.status);
        console.log('❌ Avatar generation error response:', errorText);
      }

      } catch (error) {
        console.log('⚠️ Avatar generation error:', error.message, ', creating companion without avatar');
        // Fallback to default avatar pattern if generation fails
        const timestamp = Date.now();
        avatarUrlToUse = `/avatars/generated-${slug}-${timestamp}.webp`;
        console.log('🔄 Using fallback avatar URL after error:', avatarUrlToUse);
      }
    } else {
      console.log('✅ Using pre-generated avatar URL:', preGeneratedAvatarUrl);
    }

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
      Tags: Array.isArray(tags) && tags.length > 0 ? tags : [],
      Visibility: visibility || 'public',
      Category: 'romance', // Set appropriate category for new companions instead of default
      companion_type: artStyle || 'realistic',
      sex: sex || 'female',
      ethnicity: ethnicity || 'white',
      hair_length: hairLength || 'long',
      hair_color: hairColor || 'brown',
      Avatar_URL: avatarUrlToUse,
      is_unfiltered: isUnfiltered
      // chats and rating fields don't exist in Airtable - removed
    };

    console.log('🔍 Final avatarUrlToUse before saving:', avatarUrlToUse);
    console.log('🔍 Avatar_URL in characterData:', characterData.Avatar_URL);

    // Add Created_By field only if we have a user record ID (linked record field)
    if (userRecordId) {
      characterData.Created_By = [userRecordId];
    }

    // Note: Avatar_URL is now automatically generated and included in characterData

    console.log('💾 Saving to Airtable with fields:', Object.keys(characterData));
    console.log('💾 Character data:', characterData);
    console.log('🔍 About to create character with name:', characterData.Name);
    console.log('🔍 Character slug:', characterData.Slug);
    console.log('🏷️ Tags being sent:', characterData.Tags, 'Type:', typeof characterData.Tags, 'Is Array:', Array.isArray(characterData.Tags));

    // Temporarily disable duplicate checking since we now use unique timestamp-based slugs
    console.log('🔄 Skipping duplicate check since we use unique timestamp-based slugs');

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
    console.log('🔍 Specific Avatar_URL field in result:', result.fields.Avatar_URL);
    console.log('🔍 Avatar_URL type:', typeof result.fields.Avatar_URL);
    console.log('🔍 Avatar_URL length:', result.fields.Avatar_URL?.length || 'no length');

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
          avatarUrl: result.fields.Avatar_URL,
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