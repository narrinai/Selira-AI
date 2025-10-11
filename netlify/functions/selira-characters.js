// Selira-specific characters function
// Clean implementation using Selira environment variables

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
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Missing Selira environment variables',
        needed: ['AIRTABLE_BASE_ID_SELIRA', 'AIRTABLE_TOKEN_SELIRA']
      })
    };
  }

  try {
    console.log('🚀 Selira Characters function started');
    console.log('Base ID:', SELIRA_BASE_ID);

    // Get query parameters
    const { limit = 50, category, slug, offset, includePrivate } = event.queryStringParameters || {};

    // Build Airtable URL
    let url = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`;
    const params = new URLSearchParams();

    // Build filter formula - include private if requested
    let filterFormula = includePrivate === 'true'
      ? 'TRUE()'
      : 'OR({Visibility}="public",{Visibility}="",NOT({Visibility}))';

    // Add filters
    if (slug) {
      filterFormula = `AND(${filterFormula},{Slug}='${slug}')`;
    } else if (category) {
      filterFormula = `AND(${filterFormula},{Category}='${category}')`;
    }

    params.append('filterByFormula', filterFormula);

    // Use pageSize for pagination (not maxRecords which is a hard limit)
    params.append('pageSize', Math.min(parseInt(limit) || 100, 100)); // Max 100 per page
    params.append('sort[0][field]', 'Name');
    params.append('sort[0][direction]', 'asc');

    // Add offset for pagination
    if (offset) {
      params.append('offset', offset);
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    console.log('📡 Fetching characters from Selira database...');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Retrieved ${data.records.length} characters`);

    // Debug: log first record's fields to see available field names
    if (data.records.length > 0) {
      console.log('🔍 First record fields:', Object.keys(data.records[0].fields));
      console.log('🔍 is_unfiltered variants:', {
        'is_unfiltered': data.records[0].fields.is_unfiltered,
        'Is_Unfiltered': data.records[0].fields.Is_Unfiltered,
        'IsUnfiltered': data.records[0].fields.IsUnfiltered,
        'is unfiltered': data.records[0].fields['is unfiltered']
      });
    }

    // Format characters for frontend
    const characters = data.records.map(record => ({
      id: record.id,
      name: record.fields.Name,
      slug: record.fields.Slug,
      title: record.fields.Character_Title,
      description: record.fields.Character_Description,
      category: record.fields.Category,
      tags: record.fields.Tags || [],
      avatar_url: record.fields.Avatar_URL || null, // Explicitly set null if empty
      avatar_file: record.fields.Avatar_File?.[0]?.url || null,
      prompt: record.fields.Prompt,
      // Appearance traits for image generation
      companion_type: record.fields.companion_type || 'realistic',
      sex: record.fields.sex || 'female',
      ethnicity: record.fields.ethnicity || 'white',
      hair_length: record.fields.hair_length || 'long',
      hair_color: record.fields.hair_color || 'brown',
      // Content filter
      is_unfiltered: record.fields.Is_Unfiltered || false
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: characters.length,
        characters: characters,
        offset: data.offset // Include offset for pagination
      })
    };

  } catch (error) {
    console.error('❌ Selira characters error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to retrieve characters',
        details: error.message
      })
    };
  }
};