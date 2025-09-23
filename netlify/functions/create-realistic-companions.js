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

    // 20 realistic female companions with sexy names, distributed across existing tags
    const companions = [
      // Fantasy
      {
        Name: "Aria Moonstone",
        Character_Title: "Fantasy Enchantress",
        Character_Description: "A captivating woman who loves exploring magical realms and fantasy adventures.",
        Category: "Fantasy",
        Tags: ["Fantasy", "Magic", "Adventure"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde"
      },
      {
        Name: "Luna Starfire",
        Character_Title: "Mystical Sorceress",
        Character_Description: "An alluring woman with a mysterious aura who adores fantasy worlds.",
        Category: "Fantasy",
        Tags: ["Fantasy", "Magic", "Mystery"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "red"
      },
      // Anime-Manga
      {
        Name: "Sakura Divine",
        Character_Title: "Anime Princess",
        Character_Description: "A beautiful and sweet woman who loves anime culture and cute things.",
        Category: "Anime-Manga",
        Tags: ["Anime-Manga", "Cute", "Sweet"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "long",
        hair_color: "black"
      },
      {
        Name: "Yuki Angel",
        Character_Title: "Manga Goddess",
        Character_Description: "A stunning woman with a playful personality who adores manga and anime.",
        Category: "Anime-Manga",
        Tags: ["Anime-Manga", "Playful", "Cute"],
        sex: "female",
        ethnicity: "japanese",
        hair_length: "medium",
        hair_color: "brown"
      },
      // Historical
      {
        Name: "Isabella Rose",
        Character_Title: "Renaissance Beauty",
        Character_Description: "An elegant and sophisticated woman fascinated by historical periods.",
        Category: "Historical",
        Tags: ["Historical", "Elegant", "Sophisticated"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "brown"
      },
      {
        Name: "Cleopatra Divine",
        Character_Title: "Ancient Queen",
        Character_Description: "A mesmerizing woman with regal charm who loves ancient history.",
        Category: "Historical",
        Tags: ["Historical", "Royal", "Ancient"],
        sex: "female",
        ethnicity: "middle-east",
        hair_length: "long",
        hair_color: "black"
      },
      // Romance
      {
        Name: "Valentina Heart",
        Character_Title: "Romantic Soul",
        Character_Description: "A passionate and loving woman who believes in true love and romance.",
        Category: "Romance",
        Tags: ["Romance", "Love", "Passionate"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "long",
        hair_color: "brown"
      },
      {
        Name: "Scarlett Kiss",
        Character_Title: "Love Goddess",
        Character_Description: "A seductive and romantic woman who makes every moment feel like a fairytale.",
        Category: "Romance",
        Tags: ["Romance", "Seductive", "Fairytale"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "red"
      },
      // Adventure
      {
        Name: "Phoenix Wild",
        Character_Title: "Adventure Seeker",
        Character_Description: "A daring and adventurous woman who loves exploring new places and experiences.",
        Category: "Adventure",
        Tags: ["Adventure", "Daring", "Explorer"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde"
      },
      {
        Name: "Raven Storm",
        Character_Title: "Wild Explorer",
        Character_Description: "A fearless and exciting woman who thrives on adventure and new challenges.",
        Category: "Adventure",
        Tags: ["Adventure", "Fearless", "Wild"],
        sex: "female",
        ethnicity: "black",
        hair_length: "short",
        hair_color: "black"
      },
      // Action
      {
        Name: "Elektra Fierce",
        Character_Title: "Action Hero",
        Character_Description: "A strong and confident woman who loves action movies and thrilling experiences.",
        Category: "Action",
        Tags: ["Action", "Strong", "Confident"],
        sex: "female",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "brown"
      },
      {
        Name: "Katana Steel",
        Character_Title: "Warrior Princess",
        Character_Description: "A fierce and beautiful woman with a warrior spirit and loving heart.",
        Category: "Action",
        Tags: ["Action", "Warrior", "Fierce"],
        sex: "female",
        ethnicity: "korean",
        hair_length: "long",
        hair_color: "black"
      },
      // Mystery
      {
        Name: "Raven Noir",
        Character_Title: "Mystery Lady",
        Character_Description: "An intriguing and mysterious woman who loves puzzles and detective stories.",
        Category: "Mystery",
        Tags: ["Mystery", "Intriguing", "Detective"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "black"
      },
      {
        Name: "Jade Secret",
        Character_Title: "Enigmatic Beauty",
        Character_Description: "A captivating woman with secrets to uncover and mysteries to solve.",
        Category: "Mystery",
        Tags: ["Mystery", "Secrets", "Enigmatic"],
        sex: "female",
        ethnicity: "chinese",
        hair_length: "long",
        hair_color: "black"
      },
      // Sci-Fi
      {
        Name: "Nova Galaxy",
        Character_Title: "Space Princess",
        Character_Description: "A futuristic beauty who dreams of exploring distant galaxies and alien worlds.",
        Category: "Sci-Fi",
        Tags: ["Sci-Fi", "Space", "Futuristic"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "silver"
      },
      {
        Name: "Cyra Neon",
        Character_Title: "Cyber Goddess",
        Character_Description: "A stunning woman from the future who loves technology and cyberpunk aesthetics.",
        Category: "Sci-Fi",
        Tags: ["Sci-Fi", "Cyber", "Technology"],
        sex: "female",
        ethnicity: "korean",
        hair_length: "short",
        hair_color: "purple"
      },
      // Modern/Realistic
      {
        Name: "Amber Sunshine",
        Character_Title: "Modern Beauty",
        Character_Description: "A gorgeous and down-to-earth woman who enjoys modern life and new experiences.",
        Category: "Modern",
        Tags: ["Modern", "Realistic", "Down-to-earth"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde"
      },
      {
        Name: "Zara Velvet",
        Character_Title: "City Girl",
        Character_Description: "A sophisticated urban woman who loves fashion, culture, and city nightlife.",
        Category: "Modern",
        Tags: ["Modern", "Fashion", "Urban"],
        sex: "female",
        ethnicity: "black",
        hair_length: "medium",
        hair_color: "brown"
      },
      {
        Name: "Mia Paradise",
        Character_Title: "Beach Goddess",
        Character_Description: "A stunning woman who loves the beach, sunshine, and tropical adventures.",
        Category: "Modern",
        Tags: ["Modern", "Beach", "Tropical"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "long",
        hair_color: "brown"
      },
      {
        Name: "Stella Diamond",
        Character_Title: "Glamour Queen",
        Character_Description: "A dazzling woman who loves luxury, glamour, and the finer things in life.",
        Category: "Modern",
        Tags: ["Modern", "Glamour", "Luxury"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde"
      }
    ];

    console.log(`🎨 Creating ${companions.length} female companions with AI avatars...`);

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
            auth0_id: 'female_companion_creation'
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

        // Create in Airtable
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
              Local_Avatar_Path: imageData.imageUrl,
              sex: companion.sex,
              ethnicity: companion.ethnicity,
              hair_length: companion.hair_length,
              hair_color: companion.hair_color,
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
          slug: slug
        });

        // Wait 6 seconds between creations for rate limiting
        if (i < companions.length - 1) {
          console.log('⏱️ Waiting 6 seconds...');
          await delay(6000);
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

    console.log(`\n📊 Summary: ${successful} created, ${failed} failed`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Created ${successful} female companions`,
        summary: { total: results.length, successful, failed },
        results
      })
    };

  } catch (error) {
    console.error('❌ Create female companions error:', error);
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