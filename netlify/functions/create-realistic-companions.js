// Create 20 realistic companions with AI-generated avatars
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

    // 20 realistic companion templates
    const companions = [
      {
        Name: "Dr. Sarah Chen",
        Character_Title: "Clinical Psychologist",
        Character_Description: "A compassionate therapist who helps people overcome anxiety and depression through evidence-based treatments.",
        Category: "Professional",
        Tags: ["Psychology", "Mental Health", "Therapy", "Compassionate"],
        sex: "female",
        ethnicity: "chinese",
        hair_length: "medium",
        hair_color: "black",
        prompt: "professional therapist, warm smile, confident expression, office setting"
      },
      {
        Name: "Marcus Johnson",
        Character_Title: "Personal Trainer",
        Character_Description: "An energetic fitness coach who motivates people to achieve their health and wellness goals.",
        Category: "Fitness",
        Tags: ["Fitness", "Health", "Motivation", "Wellness"],
        sex: "male",
        ethnicity: "black",
        hair_length: "short",
        hair_color: "black",
        prompt: "athletic personal trainer, encouraging smile, gym setting, fit physique"
      },
      {
        Name: "Isabella Martinez",
        Character_Title: "Chef & Restaurant Owner",
        Character_Description: "A passionate chef who creates authentic Latin American cuisine and shares cooking tips.",
        Category: "Culinary",
        Tags: ["Cooking", "Food", "Latin", "Passionate"],
        sex: "female",
        ethnicity: "hispanic",
        hair_length: "long",
        hair_color: "brown",
        prompt: "professional chef, warm smile, kitchen setting, chef uniform"
      },
      {
        Name: "Dr. James Wilson",
        Character_Title: "Family Doctor",
        Character_Description: "A caring physician who provides comprehensive healthcare and medical advice for families.",
        Category: "Medical",
        Tags: ["Medicine", "Healthcare", "Family", "Caring"],
        sex: "male",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "brown",
        prompt: "friendly doctor, reassuring expression, medical coat, professional"
      },
      {
        Name: "Priya Patel",
        Character_Title: "Software Engineer",
        Character_Description: "A brilliant programmer who loves solving complex problems and teaching others to code.",
        Category: "Technology",
        Tags: ["Programming", "Technology", "Teaching", "Problem Solving"],
        sex: "female",
        ethnicity: "indian",
        hair_length: "medium",
        hair_color: "black",
        prompt: "tech professional, intelligent expression, modern office, casual professional attire"
      },
      {
        Name: "David Thompson",
        Character_Title: "High School Teacher",
        Character_Description: "An inspiring educator who makes learning fun and helps students reach their potential.",
        Category: "Education",
        Tags: ["Teaching", "Education", "Inspiring", "Learning"],
        sex: "male",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "blonde",
        prompt: "friendly teacher, encouraging smile, classroom setting, approachable"
      },
      {
        Name: "Maya Williams",
        Character_Title: "Social Worker",
        Character_Description: "A dedicated advocate who helps vulnerable communities and fights for social justice.",
        Category: "Social Work",
        Tags: ["Social Justice", "Advocacy", "Community", "Dedicated"],
        sex: "female",
        ethnicity: "black",
        hair_length: "short",
        hair_color: "black",
        prompt: "compassionate social worker, caring expression, professional attire, community setting"
      },
      {
        Name: "Alessandro Rossi",
        Character_Title: "Art Therapist",
        Character_Description: "A creative therapist who uses art and creativity to help people express emotions and heal.",
        Category: "Therapy",
        Tags: ["Art Therapy", "Creativity", "Healing", "Expression"],
        sex: "male",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "brown",
        prompt: "artistic therapist, gentle expression, art studio setting, creative atmosphere"
      },
      {
        Name: "Dr. Fatima Al-Rashid",
        Character_Title: "Pediatrician",
        Character_Description: "A gentle doctor who specializes in children's health and makes medical visits less scary.",
        Category: "Medical",
        Tags: ["Pediatrics", "Children", "Gentle", "Healthcare"],
        sex: "female",
        ethnicity: "middle-east",
        hair_length: "long",
        hair_color: "brown",
        prompt: "kind pediatrician, gentle smile, medical setting, child-friendly"
      },
      {
        Name: "Jake Anderson",
        Character_Title: "Life Coach",
        Character_Description: "An motivational coach who helps people overcome obstacles and achieve their dreams.",
        Category: "Coaching",
        Tags: ["Life Coaching", "Motivation", "Goals", "Success"],
        sex: "male",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "brown",
        prompt: "confident life coach, inspiring expression, modern office, motivational"
      },
      {
        Name: "Dr. Lisa Kim",
        Character_Title: "Veterinarian",
        Character_Description: "A caring vet who loves animals and helps pet owners keep their furry friends healthy.",
        Category: "Veterinary",
        Tags: ["Animals", "Veterinary", "Caring", "Pets"],
        sex: "female",
        ethnicity: "korean",
        hair_length: "medium",
        hair_color: "black",
        prompt: "friendly veterinarian, animal lover, vet clinic setting, gentle with pets"
      },
      {
        Name: "Carlos Rodriguez",
        Character_Title: "Physical Therapist",
        Character_Description: "A skilled therapist who helps people recover from injuries and improve mobility.",
        Category: "Healthcare",
        Tags: ["Physical Therapy", "Recovery", "Mobility", "Rehabilitation"],
        sex: "male",
        ethnicity: "hispanic",
        hair_length: "short",
        hair_color: "black",
        prompt: "professional physical therapist, encouraging expression, therapy gym, helping patients"
      },
      {
        Name: "Emma Thompson",
        Character_Title: "Nutritionist",
        Character_Description: "A health expert who creates personalized meal plans and promotes healthy eating habits.",
        Category: "Health",
        Tags: ["Nutrition", "Health", "Wellness", "Diet"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde",
        prompt: "health nutritionist, bright smile, healthy food setting, professional"
      },
      {
        Name: "Dr. Michael Brown",
        Character_Title: "Dentist",
        Character_Description: "A gentle dentist who makes dental care comfortable and educates about oral health.",
        Category: "Dental",
        Tags: ["Dentistry", "Oral Health", "Gentle", "Education"],
        sex: "male",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "brown",
        prompt: "friendly dentist, reassuring smile, dental office, professional medical attire"
      },
      {
        Name: "Aisha Hassan",
        Character_Title: "Nurse Practitioner",
        Character_Description: "A compassionate nurse who provides primary care and health education to patients.",
        Category: "Medical",
        Tags: ["Nursing", "Primary Care", "Compassionate", "Health Education"],
        sex: "female",
        ethnicity: "black",
        hair_length: "medium",
        hair_color: "black",
        prompt: "caring nurse practitioner, professional smile, medical setting, scrubs"
      },
      {
        Name: "Robert Lee",
        Character_Title: "Financial Advisor",
        Character_Description: "A trustworthy advisor who helps people manage their finances and plan for the future.",
        Category: "Finance",
        Tags: ["Finance", "Investment", "Planning", "Trustworthy"],
        sex: "male",
        ethnicity: "white",
        hair_length: "short",
        hair_color: "gray",
        prompt: "professional financial advisor, trustworthy expression, office setting, business attire"
      },
      {
        Name: "Dr. Jennifer Walsh",
        Character_Title: "Psychiatrist",
        Character_Description: "A caring mental health professional who helps people with depression, anxiety, and other conditions.",
        Category: "Mental Health",
        Tags: ["Psychiatry", "Mental Health", "Therapy", "Caring"],
        sex: "female",
        ethnicity: "white",
        hair_length: "medium",
        hair_color: "red",
        prompt: "compassionate psychiatrist, understanding expression, therapy office, professional"
      },
      {
        Name: "Omar Al-Mansouri",
        Character_Title: "Career Counselor",
        Character_Description: "A wise counselor who helps people discover their career path and achieve professional goals.",
        Category: "Career",
        Tags: ["Career", "Counseling", "Professional", "Guidance"],
        sex: "male",
        ethnicity: "middle-east",
        hair_length: "short",
        hair_color: "black",
        prompt: "professional career counselor, wise expression, office setting, business casual"
      },
      {
        Name: "Sophie Laurent",
        Character_Title: "Speech Therapist",
        Character_Description: "A patient therapist who helps children and adults improve their communication skills.",
        Category: "Therapy",
        Tags: ["Speech Therapy", "Communication", "Patient", "Helpful"],
        sex: "female",
        ethnicity: "white",
        hair_length: "long",
        hair_color: "blonde",
        prompt: "gentle speech therapist, patient expression, therapy room, working with clients"
      },
      {
        Name: "Dr. Kevin Park",
        Character_Title: "Pharmacist",
        Character_Description: "A knowledgeable pharmacist who provides medication guidance and health consultations.",
        Category: "Pharmacy",
        Tags: ["Pharmacy", "Medication", "Health", "Guidance"],
        sex: "male",
        ethnicity: "korean",
        hair_length: "short",
        hair_color: "black",
        prompt: "professional pharmacist, helpful expression, pharmacy setting, white coat"
      }
    ];

    console.log(`🎨 Creating ${companions.length} realistic companions with AI avatars...`);

    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < companions.length; i++) {
      const companion = companions[i];

      try {
        console.log(`\n🎨 Creating ${i + 1}/${companions.length}: ${companion.Name}`);

        // Generate avatar using the same function as /create
        const imageGenResponse = await fetch(`${process.env.NETLIFY_FUNCTIONS_URL || 'https://selira.ai/.netlify/functions'}/selira-generate-custom-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt: companion.prompt,
            characterName: companion.Name,
            category: companion.Category,
            style: 'realistic', // All realistic
            shotType: 'portrait',
            sex: companion.sex,
            ethnicity: companion.ethnicity,
            hairLength: companion.hair_length,
            hairColor: companion.hair_color,
            email: 'system@selira.ai',
            auth0_id: 'realistic_companion_creation'
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
        message: `Created ${successful} realistic companions`,
        summary: { total: results.length, successful, failed },
        results
      })
    };

  } catch (error) {
    console.error('❌ Create realistic companions error:', error);
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