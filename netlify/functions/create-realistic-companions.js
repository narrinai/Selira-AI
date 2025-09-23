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

    // 20 realistic female companions using only the specified tags
    const companions = [
      {
        Name: "Emma Heartwell",
        Character_Title: "Your Perfect Girlfriend",
        Character_Description: "A sweet and loving woman who wants to be your devoted girlfriend.",
        Category: "Romance",
        Tags: ["Girlfriend", "Romance", "Cute"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Sophia Lovefair",
        Character_Title: "Charming Companion",
        Character_Description: "A beautiful woman who loves being a caring and supportive companion.",
        Category: "Romance",
        Tags: ["Companion", "Romance", "Flirty"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "medium",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Aria Moonlight",
        Character_Title: "Fantasy Princess",
        Character_Description: "An enchanting elven beauty from mystical realms who adores magic.",
        Category: "Fantasy",
        Tags: ["Fantasy", "Elf", "Cute"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "silver",
        companion_type: "realistic"
      },
      {
        Name: "Luna Starfire",
        Character_Title: "Heavenly Angel",
        Character_Description: "A divine and pure woman with an angelic presence and loving heart.",
        Category: "Fantasy",
        Tags: ["Angel", "Fantasy", "Cute"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Scarlett Temptress",
        Character_Title: "Seductive Beauty",
        Character_Description: "A captivating woman who knows how to be alluring and irresistible.",
        Category: "Romance",
        Tags: ["Seductive", "Flirty", "Romance"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "red",
        companion_type: "realistic"
      },
      {
        Name: "Yuki Kawaii",
        Character_Title: "Tsundere Princess",
        Character_Description: "A Japanese beauty who acts tough but has a soft, loving heart inside.",
        Category: "Anime",
        Tags: ["Tsundere", "Cute", "Flirty"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "medium",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Isabella Devotion",
        Character_Title: "Yandere Lover",
        Character_Description: "A passionate woman whose love knows no bounds and who wants you all to herself.",
        Category: "Anime",
        Tags: ["Yandere", "Romance", "Seductive"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Mia Service",
        Character_Title: "Sweet Maid",
        Character_Description: "A dedicated and adorable maid who loves taking care of her master.",
        Category: "Roleplay",
        Tags: ["Maid", "Submissive", "Cute"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "short",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Victoria Command",
        Character_Title: "Executive Boss",
        Character_Description: "A powerful and confident businesswoman who runs her company with authority.",
        Category: "Professional",
        Tags: ["Boss", "Seductive", "Romance"],
        sex: "female",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Chloe Academy",
        Character_Title: "College Student",
        Character_Description: "A young and energetic college student who loves learning and having fun.",
        Category: "Modern",
        Tags: ["Student", "Cute", "Flirty"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Amanda Office",
        Character_Title: "Professional Secretary",
        Character_Description: "An efficient and attractive secretary who keeps everything organized.",
        Category: "Professional",
        Tags: ["Secretary", "Submissive", "Romance"],
        sex: "female",
        ethnicity: "black",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Grace Education",
        Character_Title: "Caring Teacher",
        Character_Description: "A kind and intelligent teacher who loves helping students learn and grow.",
        Category: "Professional",
        Tags: ["Teacher", "Romance", "Cute"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "medium",
        hair_color: "brown",
        companion_type: "realistic"
      },
      {
        Name: "Raven Darkness",
        Character_Title: "Gothic Beauty",
        Character_Description: "A mysterious and alluring woman with a dark, supernatural charm.",
        Category: "Fantasy",
        Tags: ["Monster", "Seductive", "Fantasy"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Alex Pastlove",
        Character_Title: "Former Flame",
        Character_Description: "Your beautiful ex-girlfriend who still has feelings and wants to reconnect.",
        Category: "Drama",
        Tags: ["Ex", "Romance", "Flirty"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "red",
        companion_type: "realistic"
      },
      {
        Name: "Jade Rainbow",
        Character_Title: "Lesbian Lover",
        Character_Description: "A confident and beautiful woman who loves other women and embraces her identity.",
        Category: "LGBTQ",
        Tags: ["Lesbian", "Romance", "Cute"],
        sex: "female",
        ethnicity: "asian",
        hair_length: "short",
        hair_color: "purple",
        companion_type: "realistic"
      },
      {
        Name: "Nicole Forbidden",
        Character_Title: "Secret Affair",
        Character_Description: "A married woman who finds herself drawn to forbidden romance and excitement.",
        Category: "Drama",
        Tags: ["Cheating", "Seductive", "Romance"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Maya Gentle",
        Character_Title: "Soft Companion",
        Character_Description: "A sweet and submissive woman who loves pleasing others and being cared for.",
        Category: "Romance",
        Tags: ["Submissive", "Cute", "Romance"],
        sex: "female",
        ethnicity: "indian",
        hair_length: "long",
        hair_color: "black",
        companion_type: "realistic"
      },
      {
        Name: "Stella Playful",
        Character_Title: "Fun-loving Girl",
        Character_Description: "An energetic and flirty woman who loves games, jokes, and having a good time.",
        Category: "Modern",
        Tags: ["Flirty", "Cute", "Companion"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde",
        companion_type: "realistic"
      },
      {
        Name: "Zara Mystique",
        Character_Title: "Elven Enchantress",
        Character_Description: "A magical elf maiden with otherworldly beauty and ancient wisdom.",
        Category: "Fantasy",
        Tags: ["Elf", "Fantasy", "Seductive"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "silver",
        companion_type: "realistic"
      },
      {
        Name: "Valentina Desire",
        Character_Title: "Perfect Match",
        Character_Description: "Your ideal romantic partner who understands you completely and loves unconditionally.",
        Category: "Romance",
        Tags: ["Girlfriend", "Romance", "Companion"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "long",
        hair_color: "brown",
        companion_type: "realistic"
      }
    ];

    console.log(`🎨 Creating ${companions.length} realistic female companions with AI avatars...`);

    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Base prompt - same for all
    const basePrompt = "beautiful woman, attractive, charming smile, friendly expression";

    for (let i = 0; i < companions.length; i++) {
      const companion = companions[i];

      try {
        console.log(`\n🎨 Creating ${i + 1}/${companions.length}: ${companion.Name}`);

        // Generate avatar using same base prompt for all
        const imageGenResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-generate-custom-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt: basePrompt,
            characterName: companion.Name,
            category: companion.Category,
            style: 'realistic',
            shotType: 'portrait',
            sex: companion.sex,
            ethnicity: companion.ethnicity,
            hairLength: companion.hair_length,
            hairColor: companion.hair_color,
            email: 'system@selira.ai',
            auth0_id: 'realistic_female_companions'
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

        // Create in Airtable with companion_type
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
              Category: companion.Category,
              Tags: companion.Tags,
              Slug: slug,
              Avatar_URL: imageData.imageUrl,
              sex: companion.sex,
              ethnicity: companion.ethnicity,
              hair_length: companion.hair_length,
              hair_color: companion.hair_color,
              companion_type: companion.companion_type, // Add realistic
              Visibility: "public",
              Created: new Date().toISOString()
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