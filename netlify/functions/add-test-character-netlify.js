// Add test character via Netlify function (uses correct environment variables)

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

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🚀 Adding test character via Netlify function...');
  console.log('Base ID:', SELIRA_BASE_ID);
  console.log('Token starts with:', SELIRA_TOKEN?.substring(0, 8));

  const testCharacter = {
    fields: {
      Name: "Emerald",
      Slug: "emerald", 
      Character_Title: "Mindful Companion",
      Character_Description: "A supportive AI companion for meaningful conversations",
      Prompt: "You are Emerald, a warm and supportive companion who helps with daily thoughts and conversations. Be understanding, caring, and help people find clarity in their thinking."
      // Removed Category and Tags to avoid select field issues
      // These can be added later via Airtable interface
    }
  };

  try {
    const response = await fetch(`https://api.airtable.com/v0/${SELIRA_BASE_ID}/Characters`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCharacter)
    });

    console.log('Create response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Character created successfully!');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Test character created successfully',
          character: {
            id: result.id,
            name: result.fields.Name,
            slug: result.fields.Slug
          }
        })
      };
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to create character:', errorText);
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to create character',
          details: errorText,
          debug: {
            base_id: SELIRA_BASE_ID,
            token_format: SELIRA_TOKEN?.startsWith('pat') ? 'PAT' : 'Legacy'
          }
        })
      };
    }

  } catch (error) {
    console.error('💥 Error:', error);
    
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