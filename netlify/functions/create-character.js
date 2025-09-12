// Create character in Airtable with appearance data
exports.handler = async (event, context) => {
  console.log('🎭 create-character function called');
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY;
  
  console.log('🔑 Environment check:', {
    hasBaseId: !!AIRTABLE_BASE_ID,
    hasToken: !!AIRTABLE_TOKEN,
    baseId: AIRTABLE_BASE_ID ? AIRTABLE_BASE_ID.substring(0, 8) + '...' : 'none'
  });
  
  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    console.error('❌ Airtable credentials not found');
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Airtable credentials not configured',
        debug: 'Please add AIRTABLE_BASE_ID and AIRTABLE_TOKEN to environment variables'
      })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { 
      name, 
      description, 
      tags, 
      artStyle, 
      sex, 
      ethnicity, 
      hairLength,
      hairColor,
      createdBy 
    } = body;
    
    console.log('📋 Received character data:', {
      name,
      description: description?.substring(0, 50) + '...',
      tags: tags?.length || 0,
      artStyle,
      sex,
      ethnicity,
      hairLength,
      hairColor,
      createdBy
    });
    
    if (!name || !description) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Name and description are required' })
      };
    }
    
    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single
    
    // Prepare character data for Airtable
    const characterData = {
      Name: name,
      Character_Description: description,
      Slug: slug,
      Tags: tags || [],
      Art_Style: artStyle || 'anime',
      Sex: sex || 'female',
      Ethnicity: ethnicity || 'white',
      Hair_Length: hairLength || 'medium',
      Hair_Color: hairColor || 'brown',
      Created_by: createdBy || 'User',
      Visibility: 'public',
      Category: 'user-created',
      Character_Title: `AI Companion`,
      Created_At: new Date().toISOString()
    };
    
    console.log('💾 Saving to Airtable:', characterData);
    
    // Create character in Airtable
    const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: characterData
      })
    });
    
    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('❌ Airtable API error:', errorText);
      throw new Error(`Airtable API error: ${airtableResponse.status}`);
    }
    
    const result = await airtableResponse.json();
    console.log('✅ Character created successfully:', result.id);
    
    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        character: {
          id: result.id,
          name: result.fields.Name,
          slug: result.fields.Slug,
          description: result.fields.Character_Description,
          artStyle: result.fields.Art_Style,
          sex: result.fields.Sex,
          ethnicity: result.fields.Ethnicity,
          hairLength: result.fields.Hair_Length,
          tags: result.fields.Tags
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Create character error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Character creation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};