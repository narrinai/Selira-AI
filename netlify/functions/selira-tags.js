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
    console.log('🏷️ Fetching tags from companions...');

    // Extract tags from actual companions to only show tags that have characters
    return await extractTagsFromCharacters(AIRTABLE_BASE_ID, AIRTABLE_TOKEN, headers);

  } catch (error) {
    console.error('❌ Tags fetch error:', error);
    console.error('❌ Error stack:', error.stack);

    // Return empty tags array if everything fails - don't show tags that don't exist
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: [],
        total: 0,
        source: 'error_no_fallback'
      })
    };
  }
};

// Fallback: Extract unique tags from Characters table
async function extractTagsFromCharacters(baseId, token, headers) {
  try {
    console.log('🔍 Extracting tags from Characters table...');
    console.log('🔑 Using baseId:', baseId ? baseId.substring(0, 8) + '...' : 'none');

    let allTags = new Set();
    let recordCount = 0;
    let offset = null;

    // Track tag counts to only show tags with actual companions
    const tagCounts = new Map();

    // Fetch all characters with pagination to get all tags
    do {
      let url = `https://api.airtable.com/v0/${baseId}/Characters?filterByFormula=OR({Visibility}="public",{Visibility}="",NOT({Visibility}))`;
      if (offset) {
        url += `&offset=${offset}`;
      }

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

      // Extract tags from each character and count them
      if (data.records && Array.isArray(data.records)) {
        data.records.forEach(record => {
          recordCount++;
          const tags = record.fields?.Tags;
          if (tags) {
            if (Array.isArray(tags)) {
              // If tags is an array
              tags.forEach(tag => {
                if (tag && typeof tag === 'string') {
                  const cleanTag = tag.trim();
                  tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
                }
              });
            } else if (typeof tags === 'string') {
              // If tags is a comma-separated string
              tags.split(',').forEach(tag => {
                const cleanTag = tag.trim();
                if (cleanTag) {
                  tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
                }
              });
            }
          }
        });
      }

      offset = data.offset;
    } while (offset);

    // Only include tags that have at least 1 companion
    tagCounts.forEach((count, tag) => {
      if (count > 0) {
        allTags.add(tag);
      }
    });

    const tagsArray = Array.from(allTags).filter(tag => tag && tag.length > 0).sort();

    console.log('✅ Extracted tags from characters:', {
      totalRecords: recordCount,
      uniqueTags: tagsArray.length,
      tagCounts: Object.fromEntries(Array.from(tagCounts.entries()).slice(0, 20)),
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

    // Return empty tags array - don't show tags that don't exist
    console.log('🔄 Returning empty tags due to error');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tags: [],
        total: 0,
        source: 'error_no_tags'
      })
    };
  }
}