// Fetch available tags from Airtable
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔑 Environment check:', {
    hasBaseId: !!AIRTABLE_BASE_ID,
    hasToken: !!AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.substring(0, 8) + '...' : 'none'
  });

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Airtable credentials not found');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Airtable credentials not configured',
        debug: 'Please add AIRTABLE_BASE_ID_SELIRA and AIRTABLE_TOKEN_SELIRA to environment variables'
      })
    };
  }

  try {
    console.log('🏷️ Fetching tags from Airtable...');

    // Check if there's a Tags table, if not we'll extract from Characters
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Tags`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      // Tags table doesn't exist, extract unique tags from Characters table
      console.log('📋 Tags table not found, extracting from Characters...');
      return await extractTagsFromCharacters(AIRTABLE_BASE_ID, AIRTABLE_TOKEN, headers);
    }

    if (!response.ok) {
      console.error('❌ Airtable API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error details:', errorText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Raw Airtable response:', data);

    // Extract tag names from the response
    const tags = data.records.map(record => record.fields.Name || record.fields.Tag).filter(Boolean);

    console.log('🏷️ Extracted tags:', tags);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: tags.sort(),
        total: tags.length,
        source: 'tags_table'
      })
    };

  } catch (error) {
    console.error('❌ Tags fetch error:', error);
    console.error('❌ Error stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch tags',
        details: error.message
      })
    };
  }
};

// Fallback: Extract unique tags from Characters table
async function extractTagsFromCharacters(baseId, token, headers) {
  try {
    console.log('🔍 Extracting tags from Characters table...');

    let url = `https://api.airtable.com/v0/${baseId}/Characters`;
    let allTags = new Set();

    // Fetch all characters to extract tags
    do {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch characters: ${response.status}`);
      }

      const data = await response.json();

      // Extract tags from each character
      data.records.forEach(record => {
        const tags = record.fields.Tags_2;
        if (tags) {
          if (Array.isArray(tags)) {
            // If tags is an array
            tags.forEach(tag => allTags.add(tag.trim()));
          } else if (typeof tags === 'string') {
            // If tags is a comma-separated string
            tags.split(',').forEach(tag => allTags.add(tag.trim()));
          }
        }
      });

      // Get next page if available
      url = data.offset ? `https://api.airtable.com/v0/${baseId}/Characters?offset=${data.offset}` : null;

    } while (url);

    const tagsArray = Array.from(allTags).filter(tag => tag.length > 0).sort();

    console.log('✅ Extracted tags from characters:', tagsArray);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: tagsArray,
        total: tagsArray.length,
        source: 'characters_table'
      })
    };

  } catch (error) {
    console.error('❌ Character tags extraction error:', error);

    // Return fallback tags if everything fails
    const fallbackTags = [
      'Fantasy', 'Romance', 'Adventure', 'Hero', 'Mystery', 'Action', 'Magic', 'Wise', 'Historical', 'Anime-Manga',
      'Friendship', 'Comedy', 'Drama', 'Mentor', 'Villain', 'Warrior', 'Princess', 'Knight', 'Mage', 'Healer',
      'Girlfriend', 'Boyfriend', 'Companion', 'Flirty', 'Cute', 'Seductive', 'Dominant', 'Submissive', 'Tsundere',
      'Yandere', 'Angel', 'Demon', 'Elf', 'Vampire', 'School', 'Teacher', 'Student', 'Boss', 'Secretary', 'Maid'
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: fallbackTags,
        total: fallbackTags.length,
        source: 'fallback'
      })
    };
  }
}