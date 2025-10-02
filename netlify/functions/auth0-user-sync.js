// Auth0 User Sync Function for Selira AI
// Syncs Auth0 users to Airtable Users table

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const SELIRA_BASE_ID = process.env.AIRTABLE_BASE_ID_SELIRA;
  const SELIRA_TOKEN = process.env.AIRTABLE_TOKEN_SELIRA;

  console.log('🔍 Environment check:', {
    hasBaseId: !!SELIRA_BASE_ID,
    hasToken: !!SELIRA_TOKEN,
    baseId: SELIRA_BASE_ID ? SELIRA_BASE_ID.substring(0, 8) + '...' : 'missing'
  });

  if (!SELIRA_BASE_ID || !SELIRA_TOKEN) {
    console.error('❌ Missing Airtable configuration:', {
      SELIRA_BASE_ID: !!SELIRA_BASE_ID,
      SELIRA_TOKEN: !!SELIRA_TOKEN
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Missing Airtable configuration',
        details: {
          baseId: !!SELIRA_BASE_ID,
          token: !!SELIRA_TOKEN
        }
      })
    };
  }

  try {
    console.log('📥 Received sync request:', { body: event.body });
    
    let userData;
    try {
      userData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }
    
    const { auth0_id, email, name, picture } = userData;
    
    if (!auth0_id || !email) {
      console.error('❌ Missing required fields:', { auth0_id: !!auth0_id, email: !!email });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: auth0_id or email' })
      };
    }
    
    console.log('🔄 Auth0 user sync:', { auth0_id, email, name });

    // Check if user already exists
    const existingUserUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users?filterByFormula={Auth0ID}='${auth0_id}'&maxRecords=1`;
    
    const existingResponse = await fetch(existingUserUrl, {
      headers: {
        'Authorization': `Bearer ${SELIRA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!existingResponse.ok) {
      const errorText = await existingResponse.text();
      console.error('❌ Airtable check user error:', {
        status: existingResponse.status,
        statusText: existingResponse.statusText,
        error: errorText
      });
      throw new Error(`Failed to check existing user: ${existingResponse.status} - ${errorText}`);
    }

    const existingData = await existingResponse.json();

    if (existingData.records.length > 0) {
      // User exists - update last active
      const userId = existingData.records[0].id;
      const updateUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users/${userId}`;
      
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SELIRA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            LastActive: new Date().toISOString(),
            Name: name // Update name in case it changed
          }
        })
      });

      console.log('✅ Existing user updated');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          action: 'updated',
          user_id: userId
        })
      };
    } else {
      // New user - create record
      const createUrl = `https://api.airtable.com/v0/${SELIRA_BASE_ID}/Users`;
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SELIRA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Auth0ID: auth0_id,
            Email: email,
            Name: name,
            Plan: 'Free',
            display_name: name ? (name.split(' ')[0] || name) : email.split('@')[0],
            email_notifications: true,
            email_marketing: true
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('❌ Airtable create user error:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to create user: ${createResponse.status} - ${errorText}`);
      }

      const newUser = await createResponse.json();
      
      console.log('✅ New user created');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          action: 'created',
          user_id: newUser.id
        })
      };
    }

  } catch (error) {
    console.error('❌ Auth0 user sync error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'User sync failed',
        details: error.message
      })
    };
  }
};

// Generate username in format: GrumpyReindeer5428
function generateUsername() {
  const adjectives = [
    'Brave', 'Swift', 'Clever', 'Mighty', 'Cosmic', 'Golden', 'Silver', 'Bright',
    'Stormy', 'Gentle', 'Fierce', 'Noble', 'Wild', 'Zen', 'Bold', 'Quiet',
    'Grumpy', 'Happy', 'Sneaky', 'Lucky', 'Witty', 'Daring', 'Calm', 'Fiery',
    'Mystic', 'Royal', 'Ancient', 'Shadow', 'Crystal', 'Thunder', 'Frost', 'Blazing'
  ];
  
  const nouns = [
    'Tiger', 'Eagle', 'Wolf', 'Dragon', 'Phoenix', 'Lion', 'Falcon', 'Bear',
    'Fox', 'Raven', 'Panther', 'Shark', 'Hawk', 'Leopard', 'Stallion', 'Viper',
    'Reindeer', 'Dolphin', 'Penguin', 'Koala', 'Panda', 'Lynx', 'Otter', 'Seal',
    'Octopus', 'Whale', 'Sparrow', 'Turtle', 'Rabbit', 'Monkey', 'Elephant', 'Giraffe'
  ];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  
  return `${adjective}${noun}${number}`;
}