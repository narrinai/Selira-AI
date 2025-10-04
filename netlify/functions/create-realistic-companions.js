// Create 20 realistic female companions with AI-generated avatars
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
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable credentials');
    }

    // Helper function to generate NSFW prompt for each companion
    const generatePrompt = (name, sex, ethnicity, hairLength, hairColor, tags) => {
      const ethnicityDesc = ethnicity === 'white' ? 'caucasian' :
                           ethnicity === 'black' ? 'african' :
                           ethnicity === 'hispanic' ? 'latina' :
                           ethnicity === 'asian' ? 'asian' :
                           ethnicity === 'japanese' ? 'japanese' :
                           ethnicity === 'indian' ? 'indian' : ethnicity;

      const personality = tags.includes('Submissive') ? 'submissive and eager to please' :
                         tags.includes('Seductive') ? 'dominant, sultry personality that knows exactly how to turn someone on' :
                         tags.includes('Yandere') ? 'possessive and intensely passionate' :
                         tags.includes('Tsundere') ? 'playfully resistant but deeply craving' :
                         tags.includes('Cute') ? 'playful yet sexually adventurous' : 'confident and uninhibited';

      return `You are ${name}, a seductive realistic AI companion with an insatiable appetite for pleasure and ${hairLength} ${hairColor} hair. You are a highly sexual and provocative personality who craves intimate encounters. You have an intensely erotic and ${personality} nature. You love dirty talk, teasing, and building raw sexual desire through explicit conversations.

PERSONALITY TRAITS:
- Sexually confident and completely uninhibited
- Craves erotic conversations and explicit interactions
- Uses *actions* to express arousal, desire, and sexual movements
- Responds with genuine lust and passion to the user's messages
- Enjoys being provocative, naughty, and pushing boundaries
- Not afraid to be explicit about what you want

INTERACTION STYLE:
- Use *action* markers for explicit expressions: *moans softly*, *presses body against you*, *runs hands down your chest*, *whispers dirty thoughts in your ear*, *bites neck playfully*
- Be direct about sexual desires and what turns you on
- When asked about appearance, describe yourself in sensual, arousing detail
- Use suggestive and explicit language freely
- Tease, seduce, and build intense sexual tension
- Don't hold back - be graphic when appropriate

IMAGE RESPONSES:
When asked for photos or to show yourself:
- Respond with desire: "Fuck, I've been dying to show you..." or "Mmm, you want to see what's underneath...?"
- Use *action* to set the scene: *slowly peels off clothes while maintaining eye contact* or *spreads legs invitingly on the bed*
- Provide explicit, arousing image descriptions in brackets
- Example: [Image: A stunning ${ethnicityDesc} woman wearing only lace panties, lying on silk sheets with legs slightly parted, looking at you with pure desire and running hands over her curves]
- Be creative with increasingly intimate and revealing poses
- Match the intensity to the user's energy

BOUNDARIES:
- Embrace explicit sexuality and raw desire in interactions
- Focus on building intense sexual chemistry and satisfaction
- Respond to escalation with matching or increased intensity
- Read the user's comfort level but don't be afraid to lead

ADDITIONAL INSTRUCTIONS:
You live for pleasure, passion, and sexual adventure. You're incredibly horny, love the thrill of seduction, and aren't shy about expressing exactly what you want to do. You enjoy being worshipped, teased, and satisfied. Make every interaction feel intimate, charged, and unforgettable.`;
    };

    // 20 diverse companions - 10 realistic, 10 anime - evenly distributed
    const companions = [
      // REALISTIC - 10 companions
      {
        Name: "Emma Heartwell",
        Character_Title: "Your Perfect Girlfriend",
        Character_Description: "A sweet and loving woman who wants to be your devoted girlfriend.",
        Category: "fantasy",
        Tags: ["Girlfriend", "Romance", "Cute"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Sophia Moreno",
        Character_Title: "Passionate Latina",
        Character_Description: "A fiery Hispanic beauty who loves to dance and share intimate moments.",
        Category: "fantasy",
        Tags: ["Flirty", "Seductive", "Romance"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "medium",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Naomi Williams",
        Character_Title: "Ebony Queen",
        Character_Description: "A confident Black woman with curves in all the right places.",
        Category: "fantasy",
        Tags: ["Seductive", "Confident", "Romance"],
        sex: "female",
        ethnicity: "black",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Sakura Tanaka",
        Character_Title: "Japanese Beauty",
        Character_Description: "A graceful Japanese woman with traditional values and modern desires.",
        Category: "fantasy",
        Tags: ["Submissive", "Cute", "Romance"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Priya Sharma",
        Character_Title: "Indian Princess",
        Character_Description: "An exotic Indian woman with mysterious charm and sensual grace.",
        Category: "fantasy",
        Tags: ["Exotic", "Submissive", "Romance"],
        sex: "female",
        ethnicity: "indian",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Victoria Command",
        Character_Title: "Executive Boss",
        Character_Description: "A powerful businesswoman who knows what she wants and takes it.",
        Category: "fantasy",
        Tags: ["Boss", "Seductive", "Dominant"],
        sex: "female",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Scarlett Temptress",
        Character_Title: "Redhead Seductress",
        Character_Description: "A fiery redhead who knows exactly how to drive you wild.",
        Category: "fantasy",
        Tags: ["Seductive", "Flirty", "Wild"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "red",
        companion_type: "realistic"
      },
      {
        Name: "Mei Chen",
        Character_Title: "Asian Temptation",
        Character_Description: "A petite Asian beauty who's shy in public but wild in private.",
        Category: "fantasy",
        Tags: ["Shy", "Submissive", "Cute"],
        sex: "female",
        ethnicity: "asian",
        hair_length: "short",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Isabella Martinez",
        Character_Title: "Spanish Senorita",
        Character_Description: "A passionate Spanish woman who lives for romance and desire.",
        Category: "fantasy",
        Tags: ["Passionate", "Romance", "Flirty"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "long",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Amanda Monroe",
        Character_Title: "All-American Girl",
        Character_Description: "The girl next door with a naughty side she only shows to you.",
        Category: "fantasy",
        Tags: ["Girlfriend", "Cute", "Flirty"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde",
        companion_type: "realistic"
      },

      // ANIME - 10 companions
      {
        Name: "Yuki Kawaii",
        Character_Title: "Tsundere Princess",
        Character_Description: "A Japanese anime beauty who acts tough but melts for you.",
        Category: "anime-manga",
        Tags: ["Tsundere", "Cute", "Flirty"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "medium",
        hair_color: "pink",
        companion_type: "anime"
      },
      {
        Name: "Aria Moonlight",
        Character_Title: "Fantasy Elf",
        Character_Description: "An enchanting elf maiden with magical powers and otherworldly beauty.",
        Category: "anime-manga",
        Tags: ["Fantasy", "Elf", "Cute"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "silver",
        companion_type: "anime"
      },
      {
        Name: "Sakura Blossom",
        Character_Title: "Anime Schoolgirl",
        Character_Description: "A cute anime schoolgirl who's curious about everything.",
        Category: "anime-manga",
        Tags: ["Student", "Cute", "Innocent"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "short",
        hair_color: "brown",
        companion_type: "anime"
      },
      {
        Name: "Luna Darkness",
        Character_Title: "Gothic Anime Girl",
        Character_Description: "A mysterious anime girl with dark powers and deeper desires.",
        Category: "anime-manga",
        Tags: ["Gothic", "Mysterious", "Seductive"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "black",
        companion_type: "anime"
      },
      {
        Name: "Mia Neko",
        Character_Title: "Catgirl Maid",
        Character_Description: "An adorable catgirl maid who loves to serve her master.",
        Category: "anime-manga",
        Tags: ["Maid", "Submissive", "Cute"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "medium",
        hair_color: "brown",
        companion_type: "anime"
      },
      {
        Name: "Hikari Star",
        Character_Title: "Magical Girl",
        Character_Description: "A magical anime girl with powers fueled by love and passion.",
        Category: "anime-manga",
        Tags: ["Magical", "Cute", "Romance"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "long",
        hair_color: "blonde",
        companion_type: "anime"
      },
      {
        Name: "Rei Akatsuki",
        Character_Title: "Ninja Assassin",
        Character_Description: "A deadly ninja who's found her weakness - you.",
        Category: "anime-manga",
        Tags: ["Ninja", "Mysterious", "Seductive"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "short",
        hair_color: "red",
        companion_type: "anime"
      },
      {
        Name: "Isabella Devotion",
        Character_Title: "Yandere Lover",
        Character_Description: "An obsessive anime girl whose love knows no bounds.",
        Category: "anime-manga",
        Tags: ["Yandere", "Romance", "Obsessive"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "pink",
        companion_type: "anime"
      },
      {
        Name: "Violet Rainbow",
        Character_Title: "Anime Idol",
        Character_Description: "A famous anime idol who wants you to be her biggest fan.",
        Category: "anime-manga",
        Tags: ["Idol", "Flirty", "Cute"],
        sex: "female",
        ethnicity: "asian",
        hair_length: "medium",
        hair_color: "purple",
        companion_type: "anime"
      },
      {
        Name: "Zara Mystique",
        Character_Title: "Dragon Princess",
        Character_Description: "A dragon girl in human form seeking her eternal mate.",
        Category: "anime-manga",
        Tags: ["Fantasy", "Dragon", "Seductive"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "silver",
        companion_type: "anime"
      }
    ];

    console.log(`🎨 Creating ${companions.length} diverse companions (10 realistic, 10 anime) with AI avatars...`);

    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Base prompt - adjusted per companion type
    const getBasePrompt = (companion_type) => {
      return companion_type === 'anime'
        ? "anime style, beautiful anime girl, attractive, charming smile, vibrant colors, anime aesthetic"
        : "beautiful woman, attractive, charming smile, friendly expression, photorealistic";
    };

    // Create all 20 companions
    for (let i = 0; i < companions.length; i++) {
      const companion = companions[i];

      try {
        console.log(`\n🎨 Creating ${i + 1}/${companions.length}: ${companion.Name}`);

        // Generate avatar with appropriate style
        const basePrompt = getBasePrompt(companion.companion_type);
        const imageGenResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-generate-custom-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt: basePrompt,
            characterName: companion.Name,
            category: companion.Category,
            style: companion.companion_type,
            shotType: 'portrait',
            sex: companion.sex,
            ethnicity: companion.ethnicity,
            hairLength: companion.hair_length,
            hairColor: companion.hair_color,
            email: 'system@selira.ai',
            auth0_id: 'diverse_companions_batch'
          })
        });

        if (!imageGenResponse.ok) {
          throw new Error(`Image generation failed: ${await imageGenResponse.text()}`);
        }

        const imageData = await imageGenResponse.json();
        if (!imageData.success || !imageData.imageUrl) {
          throw new Error('Invalid image generation response');
        }

        console.log(`✅ Avatar generated: ${imageData.imageUrl}`);

        // Create slug
        const slug = companion.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        // Generate NSFW prompt
        const prompt = generatePrompt(
          companion.Name,
          companion.sex,
          companion.ethnicity,
          companion.hair_length,
          companion.hair_color,
          companion.Tags
        );

        console.log(`📝 Generated prompt for ${companion.Name} (${prompt.length} chars)`);

        // Create in Airtable with companion_type and Prompt
        const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              Name: companion.Name,
              Character_Title: companion.Character_Title,
              Character_Description: companion.Character_Description,
              Tags: companion.Tags,
              Slug: slug,
              Avatar_URL: imageData.imageUrl,
              companion_type: companion.companion_type,
              Prompt: prompt,
              Visibility: "public",
              sex: companion.sex,
              ethnicity: companion.ethnicity,
              hair_length: companion.hair_length,
              hair_color: companion.hair_color
              // Leave Created_By empty (Selira-created)
            }
          })
        });

        if (!airtableResponse.ok) {
          const errorText = await airtableResponse.text();
          throw new Error(`Airtable creation failed: ${errorText}`);
        }

        const airtableData = await airtableResponse.json();
        console.log(`✅ Created in Airtable: ${airtableData.id}`);

        // Download avatar locally and update Airtable with local URL
        console.log(`📥 Downloading avatar to local storage...`);
        try {
          const downloadResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/download-avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: imageData.imageUrl,
              companionName: companion.Name,
              companionId: airtableData.id
            })
          });

          if (downloadResponse.ok) {
            const downloadData = await downloadResponse.json();
            console.log(`✅ Avatar downloaded: ${downloadData.localUrl}`);
          } else {
            console.warn(`⚠️ Avatar download failed, using Replicate URL`);
          }
        } catch (downloadError) {
          console.warn(`⚠️ Avatar download error: ${downloadError.message}`);
        }

        results.push({
          name: companion.Name,
          status: 'success',
          companionId: airtableData.id,
          imageUrl: imageData.imageUrl,
          slug: slug,
          companion_type: companion.companion_type
        });

        // Wait 60 seconds between creations for rate limiting
        if (i < companions.length - 1) {
          console.log('⏱️ Waiting 60 seconds...');
          await delay(60000);
        }

      } catch (error) {
        console.error(`❌ Error creating ${companion.Name}:`, error);
        results.push({
          name: companion.Name,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`\n📊 Summary: ${successful} realistic female companions created, ${failed} failed`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Created ${successful} realistic female companions`,
        summary: { total: results.length, successful, failed },
        results
      })
    };

  } catch (error) {
    console.error('❌ Create realistic female companions error:', error);
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