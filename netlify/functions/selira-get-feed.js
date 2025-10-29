// Get feed items for the image feed page
// Fetches Generated_Images with companion info, sorted by date or popularity

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
      console.error('❌ Airtable credentials not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const limit = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    const sort = params.sort || 'newest'; // 'newest' or 'popular'

    console.log('📥 Feed request:', { limit, offset, sort });

    // Build Airtable filter - only show approved images from public companions
    // Status field should be 'approved' (or empty/missing for auto-approved)
    const filterFormula = `AND(
      OR({status} = 'approved', {status} = ''),
      {image_url} != ''
    )`;

    // Sort field based on request
    const sortField = sort === 'popular' ? 'like_count' : 'generation_date';
    const sortDirection = 'desc';

    // Fetch Generated_Images records
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Generated_Images?` +
      `filterByFormula=${encodeURIComponent(filterFormula)}&` +
      `sort[0][field]=${sortField}&` +
      `sort[0][direction]=${sortDirection}&` +
      `pageSize=${limit}&` +
      `offset=${offset}`;

    console.log('🔍 Fetching from Airtable:', airtableUrl);

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch feed', details: errorText })
      };
    }

    const data = await response.json();
    console.log(`✅ Found ${data.records?.length || 0} feed items`);

    // Process records and fetch companion details
    const feedItems = [];

    for (const record of data.records || []) {
      const fields = record.fields;

      // Get companion ID from linked record
      const companionId = fields.companion_id ? fields.companion_id[0] : null;

      if (!companionId || !fields.image_url) {
        console.log('⚠️ Skipping record without companion or image:', record.id);
        continue;
      }

      // Fetch companion details
      let companionData = null;
      try {
        const companionUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters/${companionId}`;
        const companionResponse = await fetch(companionUrl, {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (companionResponse.ok) {
          const companionRecord = await companionResponse.json();
          const compFields = companionRecord.fields;

          // Only include if companion is public (default to public if not set)
          const visibility = compFields.Visibility || compFields.visibility || 'public';
          if (visibility === 'private') {
            console.log('⚠️ Skipping private companion:', compFields.Name);
            continue;
          }

          companionData = {
            id: companionId,
            slug: compFields.Slug,
            name: compFields.Name,
            title: compFields.Title,
            description: compFields.Description,
            avatar_url: compFields.Avatar_URL || compFields.avatar_url,
            category: compFields.Category,
            sex: compFields.Sex || compFields.sex || compFields.Gender,
            creator: compFields.Created_by || 'Selira',
            tags: Array.isArray(compFields.Tags) ? compFields.Tags : (compFields.Tags || '').toString().split(',').filter(Boolean)
          };
        }
      } catch (companionError) {
        console.error('❌ Error fetching companion:', companionError);
        continue;
      }

      if (!companionData) {
        console.log('⚠️ Could not fetch companion data for:', companionId);
        continue;
      }

      // Get user who generated the image
      // First check if we have user_id link to lookup display name
      let imageCreator = 'Anonymous';

      const userId = fields.user_id ? fields.user_id[0] : null;

      if (userId) {
        try {
          // Fetch user from Users table to get display_name
          const userUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users/${userId}`;
          const userResponse = await fetch(userUrl, {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (userResponse.ok) {
            const userRecord = await userResponse.json();
            const userFields = userRecord.fields;

            imageCreator = userFields.display_name ||
                          userFields.Display_Name ||
                          userFields.displayName ||
                          userFields.email?.split('@')[0] ||
                          'Anonymous';

            console.log('✅ Found user display name:', imageCreator);
          }
        } catch (userError) {
          console.error('❌ Error fetching user:', userError);
        }
      }

      // Fallback to fields in Generated_Images if no user_id
      if (imageCreator === 'Anonymous') {
        imageCreator = fields.user_display_name ||
                      fields.display_name ||
                      fields.Display_Name ||
                      fields.user_email?.split('@')[0] ||
                      'Anonymous';
      }

      // Build feed item
      feedItems.push({
        id: record.id,
        image_url: fields.image_url,
        prompt: fields.prompt,
        generation_date: fields.generation_date,
        like_count: fields.like_count || 0,
        view_count: fields.view_count || 0,
        companion: companionData,
        created_at: fields.generation_date,
        created_by: imageCreator // User who generated this specific image
      });
    }

    console.log(`✅ Processed ${feedItems.length} valid feed items`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        items: feedItems,
        count: feedItems.length,
        hasMore: data.offset ? true : false,
        nextOffset: data.offset || null
      })
    };

  } catch (error) {
    console.error('❌ Get feed error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch feed',
        details: error.message
      })
    };
  }
};
