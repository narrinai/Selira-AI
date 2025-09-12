// Clean Selira memory retrieval function - no legacy code
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { auth0_id, email, character_slug } = JSON.parse(event.body);
    
    console.log('🧠 Selira memory retrieval:', { email, character_slug });

    if (!email || !character_slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required fields: email, character_slug'
        })
      };
    }

    // Step 1: Find user by email
    console.log('🔍 Looking up user:', email);
    
    const userResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Users?filterByFormula={Email}='${email}'&maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'User lookup failed'
        })
      };
    }

    const userData = await userResponse.json();
    if (userData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'User not found'
        })
      };
    }

    const userRecord = userData.records[0];
    console.log('✅ User found:', userRecord.id);

    // Step 2: Find character by slug  
    const charResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Characters?filterByFormula={Slug}='${character_slug}'&maxRecords=1`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!charResponse.ok) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Character lookup failed'
        })
      };
    }

    const charData = await charResponse.json();
    if (charData.records.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Character not found'
        })
      };
    }

    const characterRecord = charData.records[0];
    console.log('✅ Character found:', characterRecord.fields.Name);

    // Step 3: Get recent chat history with high importance memory
    console.log('📚 Getting important memories...');
    
    const chatFilter = `AND(
      SEARCH('${userRecord.id}', ARRAYJOIN({User})),
      SEARCH('${characterRecord.id}', ARRAYJOIN({Character})),
      {Memory_Importance} >= 7
    )`;
    
    const memoryResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/ChatHistory?filterByFormula=${encodeURIComponent(chatFilter)}&sort[0][field]=CreatedTime&sort[0][direction]=desc&maxRecords=10`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let memories = [];
    if (memoryResponse.ok) {
      const memoryData = await memoryResponse.json();
      memories = memoryData.records.map(record => ({
        id: record.id,
        message: record.fields.Message || '',
        summary: record.fields.Summary || record.fields.Message || '',
        importance: record.fields.Memory_Importance || 0,
        emotional_state: record.fields.Emotional_State || 'neutral',
        tags: record.fields.Memory_Tags || [],
        date: record.fields.CreatedTime || '',
        role: record.fields.Role || 'user'
      }));
      
      console.log('✅ Found', memories.length, 'important memories');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        memories: memories,
        count: memories.length,
        user_id: userRecord.id,
        character_id: characterRecord.id,
        message: `Found ${memories.length} important memories`
      })
    };

  } catch (error) {
    console.error('❌ Selira memory error:', error);
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