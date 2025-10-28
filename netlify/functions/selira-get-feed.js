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
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;

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
      OR({Status} = 'approved', {Status} = ''),
      {Image_URL} != ''
    )`;

    // Sort field based on request
    const sortField = sort === 'popular' ? 'Like_Count' : 'Generation_Date';
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
      const companionId = fields.Companion_ID ? fields.Companion_ID[0] : null;

      if (!companionId || !fields.Image_URL) {
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

          // Only include if companion is public
          if (compFields.Visibility !== 'public') {
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
            sex: compFields.Sex || compFields.sex || compFields.Gender
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

      // Build feed item
      feedItems.push({
        id: record.id,
        image_url: fields.Image_URL,
        prompt: fields.Prompt,
        generation_date: fields.Generation_Date,
        like_count: fields.Like_Count || 0,
        view_count: fields.View_Count || 0,
        companion: companionData,
        created_at: fields.Generation_Date
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
