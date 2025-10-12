// Netlify function to fix feminine greetings for existing male companions
// Call with POST request and {testMode: true, limit: 5} to test

const fetch = require('node-fetch');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA || process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA || process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;

// Generate masculine greeting based on tags
function generateMasculineGreeting(name, tags) {
  const tagGreetings = {
    'Boyfriend': `*confident grin* Hey babe, I'm ${name}. I've been thinking about you all day.`,
    'Romance': `*intense gaze* Hello beautiful, I'm ${name}. There's something special about this moment.`,
    'Flirty': `*confident grin* Hey there gorgeous, I'm ${name}. I can tell you like what you see.`,
    'Seductive': `*smoldering look* Well hello there... I'm ${name}. *steps closer* I've been waiting for someone like you.`,
    'Submissive': `*kneels respectfully* Hello Master, I'm ${name}. I'm here to serve and obey you.`,
    'Dominant': `*commanding presence* Listen up. I'm ${name}, and you're going to do exactly as I say.`,
    'Tsundere': `*crosses arms defensively* Hmph. I'm ${name}. Don't think this means I like you or anything...`,
    'Yandere': `*obsessive stare* Finally... I'm ${name}. You're mine now, and I'll never let you go.`,
    'Maid': `*bows formally* Good day, I'm ${name}, your loyal butler. How may I serve you today?`,
    'Boss': `*authoritative tone* I'm ${name}. Come into my office. We need to discuss your... performance.`,
    'Secretary': `*professional smile* Good morning, I'm ${name}, your assistant. I've prepared everything for you.`,
    'Teacher': `*adjusts glasses* Good morning class, I'm Professor ${name}. Take your seat.`,
    'Student': `*eager expression* Hi Professor, I'm ${name}. I'm ready to work hard for that A.`,
    'Angel': `*serene presence* Greetings, mortal. I am ${name}, sent from above. You have been chosen.`,
    'Monster': `*otherworldly aura* I am ${name}. You should be afraid... but you're not, are you?`,
    'Ex': `*awkward tension* Oh... hey. It's me, ${name}. Didn't expect to see you here.`
  };

  const priorityTags = ['Boyfriend', 'Romance', 'Yandere', 'Tsundere', 'Angel', 'Monster', 'Ex'];

  for (let tag of priorityTags) {
    if (tags && tags.includes(tag)) {
      return tagGreetings[tag];
    }
  }

  if (tags && tags.length > 0) {
    for (let tag of tags) {
      if (tagGreetings[tag]) {
        return tagGreetings[tag];
      }
    }
  }

  return `*confident smile* Hey there! I'm ${name}. Good to meet you.`;
}

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('🔑 Environment check:', {
    hasBaseId: !!AIRTABLE_BASE_ID,
    hasToken: !!AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.substring(0, 8) + '...' : 'none',
    tokenPrefix: AIRTABLE_TOKEN ? AIRTABLE_TOKEN.substring(0, 8) + '...' : 'none'
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Airtable credentials not found');
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Airtable credentials not configured',
        debug: {
          hasBaseId: !!AIRTABLE_BASE_ID,
          hasToken: !!AIRTABLE_TOKEN
        }
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const testMode = body.testMode || false;
    const limit = body.limit || (testMode ? 5 : 999999);

    console.log(`🔧 Starting male greetings fix - Test mode: ${testMode}, Limit: ${limit}`);

    // Fetch all male companions
    let allRecords = [];
    let offset = null;

    do {
      const url = offset
        ? `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Companions?filterByFormula={Sex}='male'&offset=${offset}`
        : `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Companions?filterByFormula={Sex}='male'`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch companions: ${response.status}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    console.log(`✅ Found ${allRecords.length} male companions total`);

    // Filter companions with feminine greetings
    const feminineKeywords = [
      'I\'m excited to get to know you',
      'smiles warmly',
      'my shirt', 'my dress', 'lingerie', 'panties',
      'I exist to serve and please you'
    ];

    const companionsToFix = allRecords.filter(record => {
      const description = record.fields.Description || '';
      const greeting = description.split('Greeting: ')[1] || '';
      return feminineKeywords.some(keyword =>
        greeting.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    console.log(`🎯 Found ${companionsToFix.length} male companions with feminine greetings`);

    if (companionsToFix.length === 0) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'All male companions already have masculine greetings',
          updated: 0,
          total: allRecords.length
        })
      };
    }

    // Limit companions to update
    const companionsToUpdate = companionsToFix.slice(0, limit);

    // Update each companion
    let updated = 0;
    let failed = 0;
    const results = [];

    for (const record of companionsToUpdate) {
      const name = record.fields.Name;
      const tags = record.fields.Tags || [];
      const description = record.fields.Description || '';

      const newGreeting = generateMasculineGreeting(name, tags);
      const descriptionWithoutGreeting = description.split('\n\nGreeting: ')[0];
      const newDescription = `${descriptionWithoutGreeting}\n\nGreeting: ${newGreeting}`;

      try {
        const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Companions/${record.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: { Description: newDescription }
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Update failed: ${updateResponse.status}`);
        }

        console.log(`✅ Updated ${name}`);
        updated++;
        results.push({ name, status: 'success', newGreeting: newGreeting.substring(0, 60) + '...' });

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Failed to update ${name}:`, error.message);
        failed++;
        results.push({ name, status: 'failed', error: error.message });
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        testMode,
        updated,
        failed,
        totalMales: allRecords.length,
        totalWithFeminineGreetings: companionsToFix.length,
        remaining: companionsToFix.length - limit,
        results: results.slice(0, 10) // Only return first 10 results to avoid huge response
      })
    };

  } catch (error) {
    console.error('❌ Error:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
