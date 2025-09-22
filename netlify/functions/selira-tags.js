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
    console.log('🏷️ Fetching all available tags...');

    // Return all available tags that should be selectable
    const allAvailableTags = [
      'Girlfriend', 'Boyfriend', 'Ex', 'Romance', 'Companion', 'Fantasy', 'Flirty',
      'Cute', 'Seductive', 'Submissive', 'Tsundere', 'Yandere', 'Maid', 'Boss',
      'Student', 'Secretary', 'Teacher', 'Angel', 'Elf', 'Monster', 'Lesbian', 'Cheating'
    ];

    console.log('✅ Returning all available tags:', {
      total: allAvailableTags.length,
      tags: allAvailableTags
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: allAvailableTags,
        total: allAvailableTags.length,
        source: 'predefined_all_tags'
      })
    };

  } catch (error) {
    console.error('❌ Tags fetch error:', error);
    console.error('❌ Error stack:', error.stack);

    // Return fallback tags if everything fails
    const fallbackTags = [
      'Fantasy', 'Romance', 'Adventure', 'Mystery', 'Action', 'Historical', 'Anime-Manga',
      'Friendship', 'Comedy', 'Drama', 'Girlfriend', 'Boyfriend', 'Companion', 'Flirty',
      'Cute', 'Seductive', 'Dominant', 'Submissive', 'Angel', 'Demon', 'Vampire'
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: fallbackTags,
        total: fallbackTags.length,
        source: 'fallback_hardcoded'
      })
    };
  }
};

// Fallback: Extract unique tags from Characters table
async function extractTagsFromCharacters(baseId, token, headers) {
  try {
    console.log('🔍 Extracting tags from Characters table...');
    console.log('🔑 Using baseId:', baseId ? baseId.substring(0, 8) + '...' : 'none');

    let url = `https://api.airtable.com/v0/${baseId}/Characters?maxRecords=100`;
    let allTags = new Set();
    let recordCount = 0;

    // Fetch characters to extract tags (limit to avoid timeouts)
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Characters API error:', response.status, errorText);
      throw new Error(`Failed to fetch characters: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 Characters response:', {
      recordCount: data.records?.length || 0,
      hasOffset: !!data.offset
    });

    // Extract tags from each character
    if (data.records && Array.isArray(data.records)) {
      data.records.forEach(record => {
        recordCount++;
        const tags = record.fields?.Tags;
        if (tags) {
          if (Array.isArray(tags)) {
            // If tags is an array
            tags.forEach(tag => {
              if (tag && typeof tag === 'string') {
                allTags.add(tag.trim());
              }
            });
          } else if (typeof tags === 'string') {
            // If tags is a comma-separated string
            tags.split(',').forEach(tag => {
              const cleanTag = tag.trim();
              if (cleanTag) {
                allTags.add(cleanTag);
              }
            });
          }
        }
      });
    }

    const tagsArray = Array.from(allTags).filter(tag => tag && tag.length > 0).sort();

    console.log('✅ Extracted tags from characters:', {
      totalRecords: recordCount,
      uniqueTags: tagsArray.length,
      sampleTags: tagsArray.slice(0, 10)
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: tagsArray,
        total: tagsArray.length,
        source: 'characters_table',
        recordsProcessed: recordCount
      })
    };

  } catch (error) {
    console.error('❌ Character tags extraction error:', error);
    console.error('❌ Error details:', error.message);

    // Return fallback tags if everything fails
    const fallbackTags = [
      'Fantasy', 'Romance', 'Adventure', 'Mystery', 'Action', 'Historical', 'Anime-Manga',
      'Friendship', 'Comedy', 'Drama', 'Girlfriend', 'Boyfriend', 'Companion', 'Flirty',
      'Cute', 'Seductive', 'Dominant', 'Submissive', 'Angel', 'Demon', 'Vampire'
    ];

    console.log('🔄 Returning fallback tags:', fallbackTags.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: fallbackTags,
        total: fallbackTags.length,
        source: 'fallback_after_error'
      })
    };
  }
}