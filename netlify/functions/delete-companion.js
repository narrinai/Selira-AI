// Delete Companion Netlify Function
// Replaces Make.com webhook for companion deletion

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  if (!AIRTABLE_BASE_ID || !AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Missing Airtable configuration' })
    };
  }

  try {
    console.log('🗑️ Delete companion request received');
    console.log('📥 Raw request body:', event.body);
    
    const { user_uid, slug } = JSON.parse(event.body);

    if (!user_uid || !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: user_uid and slug are required'
        })
      };
    }

    console.log('📡 Deleting companion from Airtable:', { user_uid, slug });
    
    // Delete companion directly from Airtable
    const result = await deleteCompanionFromAirtable(user_uid, slug, AIRTABLE_BASE_ID, AIRTABLE_TOKEN);
    
    if (!result.success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(result)
      };
    }

    console.log('✅ Companion deletion processed');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Delete companion function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};

// Delete companion from Airtable
async function deleteCompanionFromAirtable(user_uid, slug, baseId, token) {
  try {
    console.log('🔍 Looking for companion to delete:', { user_uid, slug });

    // Find the companion/character record
    // First try to find in Characters table by User_UID and Slug
    const filterFormula = `AND({User_UID}='${user_uid}', {Slug}='${slug}')`;
    const url = `https://api.airtable.com/v0/${baseId}/Characters?filterByFormula=${encodeURIComponent(filterFormula)}&maxRecords=1`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable find error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.records.length === 0) {
      console.warn('⚠️ Companion not found:', { user_uid, slug });
      return {
        success: false,
        error: 'Companion not found',
        details: `No character found with slug '${slug}' for user '${user_uid}'`
      };
    }

    const companionId = data.records[0].id;
    const companionName = data.records[0].fields.Name;
    
    console.log('📝 Found companion to delete:', { id: companionId, name: companionName });

    // Delete the character record
    const deleteUrl = `https://api.airtable.com/v0/${baseId}/Characters/${companionId}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('❌ Airtable delete error:', deleteResponse.status, errorText);
      throw new Error(`Failed to delete companion: ${deleteResponse.status} - ${errorText}`);
    }

    console.log('✅ Companion deleted from Airtable:', { id: companionId, name: companionName });

    // Optional: Also clean up related data like chat histories, memories, etc.
    // You could add additional cleanup logic here

    return {
      success: true,
      message: 'Companion deleted successfully',
      deleted_companion: {
        id: companionId,
        name: companionName,
        slug: slug
      }
    };

  } catch (error) {
    console.error('❌ Delete companion error:', error);
    return {
      success: false,
      error: 'Failed to delete companion',
      details: error.message
    };
  }
}