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
    const { limit = 50, category, slug } = event.queryStringParameters || {};

    // Build Airtable URL
    let url = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`;
    const params = new URLSearchParams();

    // Add filters
    if (slug) {
      params.append('filterByFormula', `{Slug}='${slug}'`);
    } else if (category) {
      params.append('filterByFormula', `{Category}='${category}'`);
    }

    params.append('maxRecords', limit);
    params.append('sort[0][field]', 'Name');
    params.append('sort[0][direction]', 'asc');

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

    // Format characters for frontend
    const characters = data.records.map(record => ({
      id: record.id,
      name: record.fields.Name,
      slug: record.fields.Slug,
      title: record.fields.Character_Title,
      description: record.fields.Character_Description,
      category: record.fields.Category,
      tags: record.fields.Tags || [],
      avatar_url: record.fields.Avatar_URL,
      avatar_file: record.fields.Avatar_File?.[0]?.url,
      prompt: record.fields.Prompt
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: characters.length,
        characters: characters
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