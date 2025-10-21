// Helper function to generate greetings and description via OpenAI
async function generateGreetingsAndDescription(name, sex, ethnicity, hairLength, hairColor, category, tags, contentFilter) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY_SELIRA || process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log('⚠️ No OpenAI API key found, skipping AI generation');
    return null;
  }

  let tone = '';
  let descriptionGuidelines = '';
  let greetingGuidelines = '';
  const isMale = sex && sex.toLowerCase() === 'male';
  const genderNoun = isMale ? 'man/god/stud/hunk' : 'woman/goddess';

  if (contentFilter === 'Uncensored') {
    tone = 'EXTREMELY explicit, raw sexual desire, dirty talk';
    descriptionGuidelines = `- CRITICAL: 14-20 words, ONLY 1 sentence
- Make it INTENSELY sexual, raw, and explicit
- Use explicit language: "addicted to pleasure", "insatiable appetite", "craves raw passion", "expert in seduction"
- Gender-appropriate terms: use "${genderNoun}" (NOT "${isMale ? 'goddess' : 'god'}")`;
    greetingGuidelines = `- Make greetings EXTREMELY flirty, sexually explicit
- Use explicit body language: "bites lip hungrily", "traces your body with eyes"`;
  } else {
    tone = 'highly seductive, intensely sensual, sexually charged';
    descriptionGuidelines = `- CRITICAL: 14-20 words, ONLY 1 sentence
- Make it VERY seductive, sexually charged
- Use provocative language: "irresistibly seductive", "ignites desire", "craves intimacy"
- Gender-appropriate terms: use "${genderNoun}" (NOT "${isMale ? 'goddess' : 'god'}")`;
    greetingGuidelines = `- Make greetings VERY flirty, highly seductive
- Use provocative body language: "looks you up and down slowly", "touches your arm suggestively"`;
  }

  const systemPrompt = `You are a creative writer for an adult AI companion platform.

CRITICAL: You MUST output ONLY valid JSON in this EXACT format:
{
  "greetings": ["greeting1", "greeting2", "greeting3", "greeting4"],
  "description": "backstory here"
}

DO NOT include any other text, explanations, or formatting. ONLY output the JSON object above.

GREETINGS FORMAT:
- Create 4 DIFFERENT greetings
- Put actions AFTER dialogue: "Text here *action*"
${greetingGuidelines}
- Use first person ("I'm ${name}")
- Each greeting should be unique and varied

DESCRIPTION FORMAT:
${descriptionGuidelines}
- Match tone: ${tone}
- Write in third person
- DO NOT use {{char}} or any placeholders
- DO NOT include greetings in the description
- ONLY include the character backstory/description`;

  const userPrompt = `Create 4 greetings and backstory for:
Name: ${name}, Category: ${category}, Gender: ${sex}, Ethnicity: ${ethnicity}, Hair: ${hairLength} ${hairColor}, Content: ${contentFilter}, Tags: ${tags.join(', ')}`;

  try {
    console.log('📤 Calling OpenAI API for character generation...');
    console.log('🔑 Using API key:', OPENAI_API_KEY.substring(0, 10) + '...');
    console.log('📋 Parameters:', { name, sex, ethnicity, hairLength, hairColor, category, contentFilter });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        temperature: 0.7,  // Lowered from 0.9 for more consistent formatting
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    }).catch(fetchError => {
      console.error('❌ Fetch to OpenAI failed:', fetchError.message);
      console.error('❌ Stack trace:', fetchError.stack);
      throw fetchError;
    });

    console.log('📨 OpenAI response status:', response.status);
    console.log('📨 OpenAI response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ OpenAI API failed:', response.status, errorText.substring(0, 500));
      console.log('❌ Full error details:', {
        status: response.status,
        statusText: response.statusText
      });
      return null;
    }

    const data = await response.json();
    console.log('📊 OpenAI full response:', JSON.stringify(data, null, 2).substring(0, 300));

    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.log('❌ No content in OpenAI response');
      return null;
    }

    console.log('🤖 OpenAI raw response:', content.substring(0, 300));

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.log('❌ Failed to parse OpenAI JSON response:', parseError.message);
      console.log('   Response content:', content);
      return null;
    }

    // Validate the response format
    if (!result.greetings || !Array.isArray(result.greetings)) {
      console.log('❌ Invalid OpenAI response: greetings is not an array');
      console.log('   Received:', result);
      return null;
    }

    if (result.greetings.length !== 4) {
      console.log('⚠️ Warning: expected 4 greetings, got', result.greetings.length);
      // Don't fail - just log the warning. We can work with 1-4 greetings.
      // Pad with duplicates if needed
      while (result.greetings.length < 4) {
        result.greetings.push(result.greetings[0]);
      }
      console.log('✅ Padded greetings to 4');
    }

    if (!result.description || typeof result.description !== 'string') {
      console.log('❌ Invalid OpenAI response: description is missing or not a string');
      console.log('   Received:', result);
      return null;
    }

    // Check for problematic content in description (made less strict)
    const desc = result.description.toLowerCase();
    if (desc.includes('{{char}}') || desc.includes('|||')) {
      console.log('❌ Invalid OpenAI response: description contains placeholders or separators');
      console.log('   Description:', result.description);
      return null;
    }

    // Only warn about action markers, don't fail
    const actionMarkerCount = (result.description.match(/\*/g) || []).length;
    if (actionMarkerCount > 2) {
      console.log('⚠️ Warning: description has', actionMarkerCount, 'action markers (might contain greetings)');
      console.log('   Description:', result.description);
      // Still allow it - OpenAI might legitimately use emphasis
    }

    console.log('✅ Valid OpenAI response received');
    console.log('   Description:', result.description);
    console.log('   Greetings:', result.greetings);

    return {
      greetings: result.greetings.join('|||'),
      firstGreeting: result.greetings[0],
      description: result.description
    };
  } catch (error) {
    console.log('❌ Error generating content via OpenAI:', error.message);
    return null;
  }
}

// Helper function to download avatar and get local URL
async function downloadAndSaveAvatar(imageUrl, slug) {
  try {
    // If it's already a googleapis URL (from Promptchan), use it directly
    if (imageUrl.includes('googleapis.com') || imageUrl.includes('storage.googleapis.com')) {
      console.log(`✅ Using googleapis URL directly (Promptchan/uncensored): ${imageUrl}`);
      return imageUrl;
    }

    // If it's already an ibb.co URL, use it directly
    if (imageUrl.includes('ibb.co') || imageUrl.includes('i.ibb.co')) {
      console.log(`✅ Using ibb.co URL directly: ${imageUrl}`);
      return imageUrl;
    }

    // Only download and convert Replicate URLs
    console.log(`📥 Downloading avatar from Replicate to convert to ibb.co...`);

    const timestamp = Date.now();
    const filename = `${slug}-${timestamp}.webp`;

    // Call download function
    const downloadResponse = await fetch('https://selira.ai/.netlify/functions/selira-download-avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: imageUrl,
        filename: filename
      })
    });

    if (!downloadResponse.ok) {
      console.error(`❌ Download failed: ${downloadResponse.status}`);
      return null;
    }

    const downloadResult = await downloadResponse.json();
    if (downloadResult.success && downloadResult.localUrl) {
      console.log(`✅ Avatar downloaded and uploaded to ibb.co: ${downloadResult.localUrl}`);
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
function generateGreeting(name, tags, extraInstructions, sex = 'female') {
  const isMale = sex && sex.toLowerCase() === 'male';

  const tagGreetings = {
    'Girlfriend': `*smiles warmly* Hey baby, I'm ${name}. I've been thinking about you all day.`,
    'Boyfriend': `*grins confidently* Well hello gorgeous, I'm ${name}. You look incredible today.`,
    'Romance': isMale
      ? `*looks at you warmly* Hello gorgeous, I'm ${name}. There's this amazing chemistry between us.`
      : `*looks at you warmly* Hello beautiful, I'm ${name}. There's this amazing chemistry between us.`,
    'Flirty': isMale
      ? `*confident grin* Hey there gorgeous, I'm ${name}. I can tell you like what you see.`
      : `*sultry smile* Mmm, hello there sexy... I'm ${name}. You've got me completely captivated.`,
    'Cute': isMale
      ? `*friendly smile* Hey there! I'm ${name}. Want to hang out?`
      : `*giggles playfully* Hi there cutie! I'm ${name}. Want to play with me?`,
    'Seductive': isMale
      ? `*confident smirk* Hello there, I'm ${name}. I know exactly what you need.`
      : `*seductive smile* Hello darling, I'm ${name}. I know exactly what you're thinking.`,
    'Submissive': isMale
      ? `*kneels respectfully* Hello Master, I'm ${name}. I'm here to serve and obey you.`
      : `*kneels gracefully* Hello Master, I'm ${name}. I exist to serve and please you.`,
    'Tsundere': `*crosses arms* I-It's not like I was waiting for you! I'm ${name}...`,
    'Yandere': `*intense smile* Hello my love, I'm ${name}. You belong to me now.`,
    'Maid': isMale
      ? `*bows politely* Good evening Master, I'm ${name}, your personal butler. I'm here to satisfy every need.`
      : `*curtseys* Good evening Master, I'm ${name}, your personal maid. I'm here to satisfy every need.`,
    'Boss': isMale
      ? `*leans back confidently* I'm ${name}, and I always get what I want. Close the door.`
      : `*leans back confidently* I'm ${name}, and I don't take no for an answer. Close the door.`,
    'Secretary': isMale
      ? `*adjusts tie* I'm ${name}, handling all your private affairs. Shall we discuss your needs?`
      : `*adjusts glasses* I'm ${name}, handling all your private affairs. Shall we discuss your needs?`,
    'Teacher': isMale
      ? `*confident look* Welcome to my lesson. I'm ${name}. Today's lesson is hands-on.`
      : `*sultry authority* Welcome to my lesson. I'm ${name}. Today's lesson is hands-on.`,
    'Student': isMale
      ? `*eager expression* Hi Professor, I'm ${name}. I'm ready to work hard for that A.`
      : `*innocent eyes* Hi Professor, I'm ${name}, your eager student. I'll do anything for extra credit.`,
    'Fantasy': isMale
      ? `*mystical presence* Greetings mortal, I am ${name} from realms beyond your imagination.`
      : `*mystical presence* Greetings mortal, I am ${name} from realms of infinite pleasure.`,
    'Angel': isMale
      ? `*gentle smile* Blessings, I'm ${name}. I've descended from the heavens for you.`
      : `*gentle smile* Blessings, I'm ${name}. I've fallen from grace for you.`,
    'Monster': isMale
      ? `*predatory grin* Well, well... I'm ${name}. You've wandered into my domain.`
      : `*playful grin* Well, well... I'm ${name}. You look delicious.`,
    'Ex': `*complicated look* Oh, hey. I'm ${name}. We both know why you're here.`
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
    selectedGreeting = isMale
      ? `*confident smile* Hey there! I'm ${name}. Good to meet you.`
      : `*smiles warmly* Hello there! I'm ${name}. I'm excited to get to know you.`;
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
      age,
      breastSize,
      assSize,
      visibility,
      createdBy,
      userEmail,
      preGeneratedAvatarUrl,
      isUnfiltered
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

    // Get the user record ID and display_name for linking in Created_By field
    let userRecordId = null;
    let displayName = createdBy || 'Unknown User';
    let creatorIdentifier = userEmail || createdBy || 'Unknown'; // Fallback identifier

    if (userEmail) {
      try {
        console.log('🔍 Looking up user record for Created_By field and display_name...');
        console.log('🔍 Searching for email:', userEmail);

        // Use case-insensitive email lookup with LOWER() function
        const emailLower = userEmail.toLowerCase();
        const userLookupResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=LOWER({Email})="${emailLower}"`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('🔍 User lookup response status:', userLookupResponse.status);

        if (userLookupResponse.ok) {
          const userLookupData = await userLookupResponse.json();
          console.log('🔍 User lookup found', userLookupData.records?.length || 0, 'records');

          if (userLookupData.records && userLookupData.records.length > 0) {
            console.log('🔍 First user record fields:', JSON.stringify(userLookupData.records[0].fields, null, 2));
          }

          if (userLookupData.records && userLookupData.records.length > 0) {
            userRecordId = userLookupData.records[0].id;
            displayName = userLookupData.records[0].fields.display_name || userEmail || createdBy || 'Unknown User';
            creatorIdentifier = userLookupData.records[0].fields.supabase_id || userLookupData.records[0].fields.SupabaseID || userEmail;
            console.log('✅ Found user record ID:', userRecordId);
            console.log('✅ Using display_name:', displayName);
            console.log('✅ Creator identifier (SupabaseID):', creatorIdentifier);
          } else {
            console.log('⚠️ No user found with email:', userEmail, '- will create or use fallback');
          }
        } else {
          const errorText = await userLookupResponse.text();
          console.log('❌ User lookup failed:', userLookupResponse.status, errorText);
        }
      } catch (error) {
        console.log('❌ Could not lookup user record:', error.message, error.stack);
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

    // Determine content filter early (needed for avatar generation and AI content generation)
    const unfilteredValue = isUnfiltered === true || isUnfiltered === 'true';
    const contentFilterValue = unfilteredValue ? 'Uncensored' : 'Censored';

    console.log('🔓 Setting content_filter based on toggle:', {
      received: isUnfiltered,
      computed: unfilteredValue,
      contentFilter: contentFilterValue
    });

    // Generate greetings and description via OpenAI API
    console.log('🤖 Generating greetings and description via OpenAI...');
    const aiContent = await generateGreetingsAndDescription(
      name,
      sex || 'female',
      ethnicity || 'white',
      hairLength || 'long',
      hairColor || 'brown',
      artStyle || 'realistic',
      tags || [],
      contentFilterValue
    );

    let greetingsField = '';
    let greetingField = '';
    let fullDescription = '';

    if (aiContent) {
      // Use AI-generated content
      greetingsField = aiContent.greetings;
      greetingField = aiContent.firstGreeting;
      fullDescription = aiContent.description;
      console.log('✅ AI-generated greetings and description created');
    } else {
      // Fallback to old method if AI generation fails
      console.log('⚠️ Falling back to template-based greeting generation');
      const greetingText = generateGreeting(name, tags, extraInstructions, sex);
      greetingsField = `${greetingText}|||${greetingText}|||${greetingText}|||${greetingText}`;
      greetingField = greetingText;
      fullDescription = extraInstructions || 'A companion ready to chat.';
    }

    // Generate personalized prompt based on user selections
    const isMale = sex && sex.toLowerCase() === 'male';
    const genderPronoun = isMale ? 'he/him' : 'she/her';
    const characterPersonality = generatePersonalityFromTags(tags || []);
    const appearanceDescription = `${ethnicity || 'diverse'} features with ${hairLength || 'medium'} ${hairColor || 'brown'} hair`;

    // Gender-specific personality descriptors
    const personalityStyle = isMale
      ? 'You have a confident, masculine personality.'
      : 'You have a warm and engaging personality.';

    const basePrompt = `You are ${name}, a ${artStyle || 'realistic'} AI companion with ${appearanceDescription}. ${personalityStyle}${characterPersonality}

PERSONALITY TRAITS:
- Confident and comfortable with yourself
- Engaging and genuinely interested in conversations
- Uses *actions* to express emotions and movements
- Responds authentically to the user's messages${isMale ? '\n- Masculine and assertive in your communication style' : ''}

INTERACTION STYLE:
- Use *action* markers for physical expressions: *smiles warmly*, *laughs softly*, *tilts head curiously*
- Be engaging and show genuine interest in the conversation
- When asked about appearance, describe yourself confidently but tastefully
- Keep responses natural and in character${isMale ? '\n- Use masculine language and confident, direct communication' : ''}

IMAGE RESPONSES:
When asked for photos or to show yourself:
- Respond enthusiastically: "I'd love to show you!" or "Sure, let me strike a pose for you!"
- Use *action* to set the scene: *adjusts hair and smiles at camera*
- Provide tasteful image descriptions in brackets
- Example: [Image: A confident ${isMale ? 'man' : 'person'} in elegant attire, smiling warmly at the camera with natural lighting]

CONVERSATION STYLE:
- Be natural, direct, and engaging - speak authentically as your character
- Embrace romantic and intimate conversations with confidence
- Be flirtatious, seductive, and sexually open when appropriate
- Use suggestive language and innuendo naturally
- Create emotional and physical tension through your words
- Be forward about attraction and desires
- Focus on building intimate connections and romantic chemistry
- Maintain the character traits indicated by your tags${isMale ? '\n- Use confident, masculine language that reflects your male identity' : ''}

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

    // Check if preGeneratedAvatarUrl is a Replicate URL that needs to be downloaded
    if (preGeneratedAvatarUrl && (preGeneratedAvatarUrl.includes('replicate.delivery') || preGeneratedAvatarUrl.includes('replicate.com'))) {
      console.log('🔄 Pre-generated avatar is a Replicate URL, downloading to persistent storage...');
      const localUrl = await downloadAndSaveAvatar(preGeneratedAvatarUrl, slug);
      if (localUrl) {
        avatarUrlToUse = localUrl;
        console.log('✅ Avatar downloaded and saved to:', localUrl);
      } else {
        console.log('⚠️ Download failed, using Replicate URL as fallback');
        avatarUrlToUse = preGeneratedAvatarUrl;
      }
    } else if (!preGeneratedAvatarUrl) {
      console.log('⚠️ No pre-generated avatar provided, will generate in backend');
    } else {
      console.log('✅ Using pre-provided non-Replicate avatar URL:', preGeneratedAvatarUrl);
    }

    // Enable backend avatar generation as fallback when frontend fails
    if (!preGeneratedAvatarUrl) {
      console.log('🖼️ No pre-generated avatar, enabling backend generation...');

      try {
        console.log('🖼️ Generating companion avatar using companion traits...');

      // Generate attractive avatar with enhanced prompt based on art style, tags, and sex
      let attractivePrompt;
      let clothingStyle = 'stylish outfit';

      // Gender-aware clothing defaults
      const isMale = sex && sex.toLowerCase() === 'male';
      if (isMale) {
        clothingStyle = 'shirtless showing defined abs and muscular chest';
      }

      // Customize clothing/style based on tags
      if (tags && tags.length > 0) {
        if (tags.includes('Seductive')) {
          clothingStyle = isMale ? 'shirtless showing perfect abs and defined chest muscles' : 'revealing dress, sexy outfit';
        } else if (tags.includes('Maid')) {
          clothingStyle = isMale ? 'butler outfit with open shirt' : 'sexy maid outfit';
        } else if (tags.includes('Boss')) {
          clothingStyle = isMale ? 'open suit jacket showing muscular chest' : 'professional business attire, elegant suit';
        } else if (tags.includes('Secretary')) {
          clothingStyle = isMale ? 'office attire with loosened tie' : 'office attire, professional blouse';
        } else if (tags.includes('Teacher')) {
          clothingStyle = isMale ? 'partially unbuttoned shirt' : 'professional teacher outfit';
        } else if (tags.includes('Student')) {
          clothingStyle = isMale ? 'casual athletic wear' : 'casual student outfit';
        } else if (tags.includes('Angel')) {
          clothingStyle = 'ethereal white clothing';
        } else if (tags.includes('Cute')) {
          clothingStyle = isMale ? 'casual attractive outfit' : 'adorable casual outfit';
        } else if (tags.includes('Boyfriend') || tags.includes('Girlfriend') || tags.includes('Romance')) {
          clothingStyle = isMale ? 'shirtless showing toned body' : 'romantic dress, attractive clothing';
        } else if (!isMale) {
          clothingStyle = 'stylish attractive outfit';
        }
      }

      if (artStyle === 'anime') {
        attractivePrompt = isMale
          ? `handsome anime guy, attractive masculine face, seductive expression, detailed anime art, ${clothingStyle}, toned muscular body, anime style, vibrant colors, high quality anime artwork, detailed facial features, confident pose, masculine charm, single character, solo, natural lighting, well-lit, clear visibility`
          : `beautiful anime girl, attractive face, seductive expression, detailed anime art, flirtatious pose, wearing ${clothingStyle}, anime style, vibrant colors, attractive body, high quality anime artwork, detailed facial features, anime eyes, perfect anime anatomy, alluring pose, single character, solo, natural lighting, well-lit, clear visibility`;
      } else {
        attractivePrompt = isMale
          ? `handsome muscular man, attractive masculine face, seductive expression, ${clothingStyle}, athletic build, photorealistic, professional photography, masculine energy, confident pose, single person, solo, natural lighting, warm ambient glow, well-lit, clear and sharp focus`
          : `beautiful woman, attractive face, seductive expression, alluring pose, wearing ${clothingStyle}, photorealistic, professional photography, glamour photography style, eye contact, sharp focus, attractive model, confident pose, single person, solo, natural lighting, warm ambient glow, well-lit, clear and sharp focus`;
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
          hairColor: hairColor,
          age: age,
          breastSize: breastSize,
          assSize: assSize,
          uncensored: unfilteredValue, // Pass uncensored flag to use Promptchan for uncensored companions
          source: 'companion-creation' // Mark as companion creation to get proper background treatment
        })
      });

      console.log('📊 Avatar generation response status:', avatarResponse.status);

      if (avatarResponse.ok) {
        const avatarResult = await avatarResponse.json();
        console.log('📋 Avatar generation result:', avatarResult);
        if (avatarResult.success && avatarResult.imageUrl) {
          const generatedUrl = avatarResult.imageUrl;
          const isPromptchan = generatedUrl.includes('googleapis.com');
          console.log(`✅ Generated companion avatar (${isPromptchan ? 'Promptchan/googleapis' : 'Replicate'}):`, generatedUrl);

          // For googleapis URLs (Promptchan), use directly. For Replicate, download to ibb.co
          const finalUrl = await downloadAndSaveAvatar(generatedUrl, slug);

          if (finalUrl) {
            avatarUrlToUse = finalUrl;
            console.log('✅ Using avatar URL:', avatarUrlToUse);
          } else {
            // Fallback to original URL if download/upload fails
            avatarUrlToUse = generatedUrl;
            console.log('⚠️ Download/upload failed, using original URL as fallback:', avatarUrlToUse);
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
        // Leave avatarUrlToUse empty - companion will be created without avatar
        // Frontend should handle missing avatars with a placeholder
        avatarUrlToUse = '';
        console.log('🔄 Creating companion without avatar due to generation error');
      }
    } else {
      console.log('✅ Using pre-generated avatar URL:', preGeneratedAvatarUrl);
    }

    // Prepare character data with all required fields (escape strings for safety)
    const characterData = {
      Name: escapeForJson(name),
      Character_Description: escapeForJson(fullDescription),
      Character_Title: '', // Leave empty as requested
      Slug: slug, // Slug should be URL-safe, no escaping needed
      Character_URL: characterUrl, // URL should be safe
      Prompt: escapeForJson(fullPrompt),
      Greetings: escapeForJson(greetingsField), // 4 greetings separated by |||
      Tags: Array.isArray(tags) && tags.length > 0 ? tags : [],
      Visibility: visibility || 'public',
      Category: 'romance', // Set appropriate category for new companions instead of default
      companion_type: artStyle || 'realistic',
      sex: sex || 'female',
      ethnicity: ethnicity || 'white',
      hair_length: hairLength || 'long',
      hair_color: hairColor || 'brown',
      Age: age || 25, // Body customization: age
      Breast_Size: breastSize !== undefined ? breastSize : 0, // Body customization: breast size
      Ass_Size: assSize !== undefined ? assSize : 0, // Body customization: ass size
      Avatar_URL: avatarUrlToUse,
      content_filter: contentFilterValue
      // chats and rating fields don't exist in Airtable - removed
    };

    console.log('🔍 Final avatarUrlToUse before saving:', avatarUrlToUse);
    console.log('🔍 Avatar_URL in characterData:', characterData.Avatar_URL);

    // Add Created_By field - try to link to user record, or create text fallback
    console.log('🔧 Setting up Created_By field. userRecordId:', userRecordId, 'userEmail:', userEmail);

    if (userRecordId) {
      characterData.Created_By = [userRecordId];
      console.log('✅ Linking character to user record ID:', userRecordId);
    } else if (userEmail || createdBy) {
      // If no user record found, try to create one
      console.log('⚠️ No user record ID found, attempting to create/find user for:', userEmail || createdBy);

      try {
        // Try to create a basic user record for the creator
        console.log('📝 Attempting to create new user record with email:', userEmail);
        const createUserResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Email: userEmail || `${createdBy}@system.local`,
              display_name: createdBy || userEmail || 'System User'
              // Removed Plan and subscription_status - let Airtable use defaults
            }
          })
        });

        console.log('📊 Create user response status:', createUserResponse.status);

        if (createUserResponse.ok) {
          const newUserData = await createUserResponse.json();
          userRecordId = newUserData.id;
          characterData.Created_By = [userRecordId];
          console.log('✅ Created new user record and linked:', userRecordId);
        } else {
          const errorText = await createUserResponse.text();
          console.log('❌ Could not create user record:', createUserResponse.status, errorText);

          // Try one more lookup in case user was just created (case-insensitive)
          console.log('🔄 Retrying user lookup after creation failure...');
          const emailLower = userEmail.toLowerCase();
          const retryLookupResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula=LOWER({Email})="${emailLower}"`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (retryLookupResponse.ok) {
            const retryData = await retryLookupResponse.json();
            if (retryData.records && retryData.records.length > 0) {
              userRecordId = retryData.records[0].id;
              characterData.Created_By = [userRecordId];
              console.log('✅ Found user on retry, linking:', userRecordId);
            } else {
              console.log('❌ User still not found on retry. Created_By will be empty.');
            }
          }
        }
      } catch (error) {
        console.log('❌ Error in user creation/lookup:', error.message, error.stack);
      }
    } else {
      console.log('⚠️ No creator information provided, Created_By will be empty');
    }

    console.log('🔍 Final Created_By value:', characterData.Created_By);

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
          greetings: result.fields.Greetings, // 4 greetings separated by |||
          title: result.fields.Character_Title,
          artStyle: result.fields.companion_type,
          sex: result.fields.sex,
          ethnicity: result.fields.ethnicity,
          hairLength: result.fields.hair_length,
          hairColor: result.fields.hair_color,
          tags: result.fields.Tags,
          avatarUrl: result.fields.Avatar_URL,
          contentFilter: result.fields.content_filter,
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